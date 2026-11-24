import type {
  MailResult,
  MessageDetail,
  MessageSummary,
  SavedInbox,
} from './types';

async function parseJsonResponse<T>(res: Response): Promise<MailResult<T>> {
  let payload: MailResult<T> | null = null;
  try {
    payload = (await res.json()) as MailResult<T>;
  } catch {
    payload = null;
  }

  if (payload && typeof payload.ok === 'boolean') {
    if (!payload.ok && !payload.status) {
      return { ...payload, status: res.status };
    }
    return payload;
  }

  if (!res.ok) {
    return {
      ok: false,
      error: `Request failed with status ${res.status}`,
      status: res.status,
    };
  }

  return {
    ok: false,
    error: 'Unexpected response from server.',
    status: res.status,
  };
}

export async function getActiveDomains(): Promise<MailResult<string[]>> {
  const res = await fetch('/api/mail/domains');
  return parseJsonResponse<string[]>(res);
}

export async function createInbox(input?: {
  localPart?: string;
  domain?: string;
}): Promise<MailResult<SavedInbox>> {
  const res = await fetch('/api/mail/inbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input ?? {}),
  });
  return parseJsonResponse<SavedInbox>(res);
}

export async function refreshInboxToken(input: {
  address: string;
  password: string;
}): Promise<MailResult<{ id: string; token: string }>> {
  const res = await fetch('/api/mail/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJsonResponse<{ id: string; token: string }>(res);
}

export async function listMessages(
  token: string,
  page = 1,
): Promise<MailResult<MessageSummary[]>> {
  const res = await fetch(`/api/mail/messages?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonResponse<MessageSummary[]>(res);
}

export async function readMessage(
  token: string,
  messageId: string,
): Promise<MailResult<MessageDetail>> {
  const res = await fetch(
    `/api/mail/messages/${encodeURIComponent(messageId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return parseJsonResponse<MessageDetail>(res);
}

export async function deleteMessage(
  token: string,
  messageId: string,
): Promise<MailResult<null>> {
  const res = await fetch(
    `/api/mail/messages/${encodeURIComponent(messageId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return parseJsonResponse<null>(res);
}

export async function burnInbox(
  token: string,
  accountId: string,
): Promise<MailResult<null>> {
  const res = await fetch(
    `/api/mail/account/${encodeURIComponent(accountId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return parseJsonResponse<null>(res);
}
