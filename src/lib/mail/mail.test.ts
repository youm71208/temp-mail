/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractVerificationCodes } from './codes';
import {
  formatByteSize,
  formatRelativeTime,
  formatSenderLabel,
} from './format';
import {
  buildSandboxedMailDocument,
  htmlToPlainText,
  sanitizeMailHtml,
} from './html';
import {
  loadActiveAddress,
  loadSavedInboxes,
  MAX_SAVED_INBOXES,
  removeSavedInbox,
  saveActiveAddress,
  upsertSavedInbox,
  type StorageLike,
} from './storage';
import type { SavedInbox } from './types';
import {
  cleanLocal,
  generateRandomLocalPart,
  generateRandomPassword,
} from './validation';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

test('cleanLocal validates and normalizes custom local parts', () => {
  const randomRes = cleanLocal(undefined);
  assert.equal(randomRes.ok, true);
  if (randomRes.ok) {
    assert.ok(randomRes.data.length >= 6);
  }

  const valid = cleanLocal('  Alex.Verify_24 ');
  assert.deepEqual(valid, { ok: true, data: 'alex.verify_24' });

  const withAt = cleanLocal('alex@example.com');
  assert.equal(withAt.ok, false);

  const tooShort = cleanLocal('ab');
  assert.equal(tooShort.ok, false);

  const doubleDots = cleanLocal('alex..test');
  assert.equal(doubleDots.ok, false);

  const randomPart = generateRandomLocalPart();
  assert.equal(cleanLocal(randomPart).ok, true);
  assert.equal(generateRandomPassword(24).length, 24);
});

test('extractVerificationCodes pulls OTP codes and ignores false positives', () => {
  const codes1 = extractVerificationCodes({
    subject: 'Your verification code is 482910',
    text: 'Copyright 2026 Acme Corp. Color #123456. Enter 482910 to sign in.',
  });
  assert.deepEqual(
    codes1.map((c) => c.code),
    ['482910'],
  );

  const codes2 = extractVerificationCodes({
    subject: 'Confirm your email',
    html: [
      '<p>Hello! Use one-time passcode <strong>739-204</strong> within 10 minutes.</p><p>© 2026</p>',
    ],
  });
  assert.equal(codes2[0]?.code, '739204');

  const codes3 = extractVerificationCodes({
    subject: 'Weekly newsletter',
    text: 'Check out our 2026 report at 12:30 for $1999.',
  });
  assert.deepEqual(codes3, []);

  const codes4 = extractVerificationCodes({
    subject: 'Account confirmation',
    text: 'Your confirmation code: AB94K2',
  });
  assert.equal(codes4[0]?.code, 'AB94K2');
  assert.equal(codes4[0]?.kind, 'alphanumeric');
});

test('sanitizeMailHtml removes scripts, handlers, dangerous tags, and unsafe URLs', () => {
  const dirty = [
    '<div onclick="alert(1)"><script>stealCookies()</script>',
    '<p>Welcome to <strong>Postlet</strong></p>',
    '<img src="https://example.com/logo.png" onerror="fetch(\'/x\')" />',
    '<a href="javascript:alert(2)">Bad Link</a>',
    '<a href="https://mail.tm">Safe Link</a>',
    '<iframe src="https://evil.test"></iframe>',
    '</div>',
  ].join('');

  const clean = sanitizeMailHtml(dirty);
  assert.equal(clean.includes('<script'), false);
  assert.equal(clean.includes('stealCookies'), false);
  assert.equal(clean.includes('onclick'), false);
  assert.equal(clean.includes('onerror'), false);
  assert.equal(clean.includes('javascript:'), false);
  assert.equal(clean.includes('<iframe'), false);
  assert.equal(clean.includes('Welcome to <strong>Postlet</strong>'), true);
  assert.equal(
    clean.includes('href="https://mail.tm" target="_blank" rel="noopener noreferrer nofollow"'),
    true,
  );

  const doc = buildSandboxedMailDocument(clean);
  assert.equal(doc.startsWith('<!doctype html>'), true);
  assert.equal(htmlToPlainText('<p>Line 1</p><p>Line 2</p>'), 'Line 1\nLine 2');
});

test('storage persists up to 6 unique saved inboxes and active address', () => {
  const storage = createMemoryStorage();
  for (let i = 1; i <= 8; i += 1) {
    const inbox: SavedInbox = {
      address: `user${i}@fldubai.com`,
      password: `pass${i}`,
      token: `tok${i}`,
      accountId: `acc${i}`,
      createdAt: `2026-11-13T10:0${i}:00.000Z`,
    };
    upsertSavedInbox(inbox, storage);
  }

  const loaded = loadSavedInboxes(storage);
  assert.equal(loaded.length, MAX_SAVED_INBOXES);
  assert.equal(loaded[0]?.address, 'user8@fldubai.com');
  assert.equal(loaded[5]?.address, 'user3@fldubai.com');

  // Upserting an existing address moves it to the top without duplicating
  upsertSavedInbox(
    {
      address: 'user4@fldubai.com',
      password: 'updated',
      token: 'tok4-new',
      accountId: 'acc4',
      createdAt: '2026-11-13T10:04:00.000Z',
    },
    storage,
  );
  const reordered = loadSavedInboxes(storage);
  assert.equal(reordered.length, MAX_SAVED_INBOXES);
  assert.equal(reordered[0]?.address, 'user4@fldubai.com');

  removeSavedInbox('user4@fldubai.com', storage);
  assert.equal(loadSavedInboxes(storage).length, MAX_SAVED_INBOXES - 1);

  saveActiveAddress('user8@fldubai.com', storage);
  assert.equal(loadActiveAddress(storage), 'user8@fldubai.com');
  saveActiveAddress(null, storage);
  assert.equal(loadActiveAddress(storage), null);
});

test('format helpers format relative times, byte sizes, and sender labels', () => {
  const now = Date.parse('2026-11-13T20:00:00.000Z');
  assert.equal(formatRelativeTime('2026-11-13T19:59:40.000Z', now), 'Just now');
  assert.equal(formatRelativeTime('2026-11-13T19:55:00.000Z', now), '5m ago');
  assert.equal(formatRelativeTime('2026-11-13T17:00:00.000Z', now), '3h ago');
  assert.equal(formatByteSize(512), '512 B');
  assert.equal(formatByteSize(2048), '2.0 KB');
  assert.deepEqual(
    formatSenderLabel({ name: 'GitHub', address: 'noreply@github.com' }),
    { primary: 'GitHub', secondary: 'noreply@github.com' },
  );
  assert.deepEqual(
    formatSenderLabel({ name: '', address: 'noreply@github.com' }),
    { primary: 'noreply@github.com', secondary: '' },
  );
});
