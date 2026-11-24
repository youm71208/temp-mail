import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cleanLocal,
  generateRandomPassword,
} from './src/lib/mail/validation.ts';
import type {
  MailResult,
  MessageDetail,
  MessageSummary,
  SavedInbox,
} from './src/lib/mail/types.ts';

const MAIL_TM_BASE = 'https://api.mail.tm';
const PORT = 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

type MailTmErrorPayload = {
  detail?: string;
  message?: string;
  'hydra:description'?: string;
  violations?: Array<{ propertyPath?: string; message?: string }>;
};

async function mailFetch<T>(
  endpoint: string,
  token: string | null,
  init: RequestInit = {},
): Promise<MailResult<T>> {
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${MAIL_TM_BASE}${endpoint}`, {
      ...init,
      headers,
    });
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Could not reach mail.tm: ${err.message}`
          : 'Could not reach mail.tm.',
      status: 502,
    };
  }

  if (response.status === 204) {
    return { ok: true, data: undefined as T };
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errObj = (parsed ?? {}) as MailTmErrorPayload;
    const violationMsg = errObj.violations?.[0]?.message;
    const message =
      violationMsg ||
      errObj['hydra:description'] ||
      errObj.detail ||
      errObj.message ||
      `mail.tm responded with status ${response.status}`;
    return {
      ok: false,
      error: message,
      status: response.status,
    };
  }

  return { ok: true, data: parsed as T };
}

type DomainRecord = {
  id: string;
  domain: string;
  isActive: boolean;
  isPrivate?: boolean;
};

type HydraOrArray<T> = T[] | { 'hydra:member'?: T[] };

function unwrapCollection<T>(payload: HydraOrArray<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload?.['hydra:member'] ?? [];
}

let cachedDomains: { domains: string[]; expiresAt: number } | null = null;

async function activeDomains(): Promise<MailResult<string[]>> {
  const now = Date.now();
  if (cachedDomains && cachedDomains.expiresAt > now) {
    return { ok: true, data: cachedDomains.domains };
  }

  const result = await mailFetch<HydraOrArray<DomainRecord>>('/domains', null);
  if (!result.ok) return result;

  const domains = unwrapCollection(result.data)
    .filter((item) => item.isActive && !item.isPrivate)
    .map((item) => item.domain);

  if (domains.length === 0) {
    return {
      ok: false,
      error: 'No active mail.tm domains are currently available.',
      status: 503,
    };
  }

  cachedDomains = { domains, expiresAt: now + 60_000 };
  return { ok: true, data: domains };
}

async function issueToken(
  address: string,
  password: string,
): Promise<MailResult<{ id: string; token: string }>> {
  return mailFetch<{ id: string; token: string }>('/token', null, {
    method: 'POST',
    body: JSON.stringify({ address, password }),
  });
}

function readBearerToken(req: express.Request): string | null {
  const auth = req.header('authorization');
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/mail/domains', async (_req, res) => {
    const result = await activeDomains();
    if (!result.ok) {
      res.status(result.status ?? 500).json(result);
      return;
    }
    res.json(result);
  });

  app.post('/api/mail/inbox', async (req, res) => {
    const body = (req.body ?? {}) as { localPart?: string; domain?: string };
    const cleaned = cleanLocal(body.localPart);
    if (!cleaned.ok) {
      res.status(400).json(cleaned);
      return;
    }

    const domains = await activeDomains();
    if (!domains.ok) {
      res.status(domains.status ?? 503).json(domains);
      return;
    }

    const chosenDomain =
      body.domain && domains.data.includes(body.domain)
        ? body.domain
        : domains.data[0];

    const address = `${cleaned.data}@${chosenDomain}`;
    const password = generateRandomPassword();

    const created = await mailFetch<{
      id: string;
      address?: string;
      createdAt?: string;
    }>('/accounts', null, {
      method: 'POST',
      body: JSON.stringify({ address, password }),
    });

    if (!created.ok) {
      res.status(created.status ?? 422).json(created);
      return;
    }

    const canonicalAddress = created.data.address || address;
    const tokenRes = await issueToken(canonicalAddress, password);
    if (!tokenRes.ok) {
      res.status(tokenRes.status ?? 500).json(tokenRes);
      return;
    }

    const saved: SavedInbox = {
      address: canonicalAddress,
      password,
      token: tokenRes.data.token,
      accountId: created.data.id || tokenRes.data.id,
      createdAt: created.data.createdAt ?? new Date().toISOString(),
    };

    res.status(201).json({ ok: true, data: saved } satisfies MailResult<SavedInbox>);
  });

  app.post('/api/mail/token', async (req, res) => {
    const { address, password } = (req.body ?? {}) as {
      address?: string;
      password?: string;
    };
    if (!address || !password) {
      res
        .status(400)
        .json({ ok: false, error: 'Address and password are required.' });
      return;
    }
    const tokenRes = await issueToken(address, password);
    if (!tokenRes.ok) {
      res.status(tokenRes.status ?? 401).json(tokenRes);
      return;
    }
    res.json(tokenRes);
  });

  app.get('/api/mail/messages', async (req, res) => {
    const token = readBearerToken(req);
    if (!token) {
      res.status(401).json({ ok: false, error: 'Missing session token.' });
      return;
    }

    const page = Number(req.query.page ?? 1) || 1;
    const result = await mailFetch<HydraOrArray<MessageSummary>>(
      `/messages?page=${page}`,
      token,
    );

    if (!result.ok) {
      res.status(result.status ?? 500).json(result);
      return;
    }

    res.json({
      ok: true,
      data: unwrapCollection(result.data),
    } satisfies MailResult<MessageSummary[]>);
  });

  app.get('/api/mail/messages/:id', async (req, res) => {
    const token = readBearerToken(req);
    if (!token) {
      res.status(401).json({ ok: false, error: 'Missing session token.' });
      return;
    }

    const msgId = encodeURIComponent(req.params.id);
    const result = await mailFetch<MessageDetail>(`/messages/${msgId}`, token);
    if (!result.ok) {
      res.status(result.status ?? 500).json(result);
      return;
    }

    // Best-effort mark as seen if unread
    if (!result.data.seen) {
      void mailFetch(`/messages/${msgId}`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/merge-patch+json' },
        body: JSON.stringify({ seen: true }),
      });
    }

    res.json(result);
  });

  app.delete('/api/mail/messages/:id', async (req, res) => {
    const token = readBearerToken(req);
    if (!token) {
      res.status(401).json({ ok: false, error: 'Missing session token.' });
      return;
    }

    const msgId = encodeURIComponent(req.params.id);
    const result = await mailFetch<void>(`/messages/${msgId}`, token, {
      method: 'DELETE',
    });
    if (!result.ok) {
      res.status(result.status ?? 500).json(result);
      return;
    }
    res.json({ ok: true, data: null });
  });

  app.delete('/api/mail/account/:id', async (req, res) => {
    const token = readBearerToken(req);
    if (!token) {
      res.status(401).json({ ok: false, error: 'Missing session token.' });
      return;
    }

    const accountId = encodeURIComponent(req.params.id);
    const result = await mailFetch<void>(`/accounts/${accountId}`, token, {
      method: 'DELETE',
    });
    if (!result.ok) {
      res.status(result.status ?? 500).json(result);
      return;
    }
    res.json({ ok: true, data: null });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Postlet server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
