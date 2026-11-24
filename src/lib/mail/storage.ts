import type { SavedInbox } from './types';

export const MAX_SAVED_INBOXES = 6;
const INBOXES_KEY = 'postlet:inboxes:v1';
const ACTIVE_ADDRESS_KEY = 'postlet:active_address:v1';

export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function getDefaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidInbox(candidate: unknown): candidate is SavedInbox {
  if (!candidate || typeof candidate !== 'object') return false;
  const obj = candidate as Record<string, unknown>;
  return (
    typeof obj.address === 'string' &&
    obj.address.includes('@') &&
    typeof obj.password === 'string' &&
    typeof obj.token === 'string' &&
    typeof obj.accountId === 'string' &&
    typeof obj.createdAt === 'string'
  );
}

export function loadSavedInboxes(
  storage: StorageLike | null = getDefaultStorage(),
): SavedInbox[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(INBOXES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidInbox).slice(0, MAX_SAVED_INBOXES);
  } catch {
    return [];
  }
}

export function saveInboxes(
  inboxes: SavedInbox[],
  storage: StorageLike | null = getDefaultStorage(),
): SavedInbox[] {
  const normalized = inboxes.slice(0, MAX_SAVED_INBOXES);
  if (storage) {
    try {
      storage.setItem(INBOXES_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore quota errors cleanly
    }
  }
  return normalized;
}

export function upsertSavedInbox(
  inbox: SavedInbox,
  storage: StorageLike | null = getDefaultStorage(),
): SavedInbox[] {
  const existing = loadSavedInboxes(storage).filter(
    (item) => item.address.toLowerCase() !== inbox.address.toLowerCase(),
  );
  const next = [inbox, ...existing].slice(0, MAX_SAVED_INBOXES);
  return saveInboxes(next, storage);
}

export function removeSavedInbox(
  address: string,
  storage: StorageLike | null = getDefaultStorage(),
): SavedInbox[] {
  const next = loadSavedInboxes(storage).filter(
    (item) => item.address.toLowerCase() !== address.toLowerCase(),
  );
  return saveInboxes(next, storage);
}

export function loadActiveAddress(
  storage: StorageLike | null = getDefaultStorage(),
): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(ACTIVE_ADDRESS_KEY);
  } catch {
    return null;
  }
}

export function saveActiveAddress(
  address: string | null,
  storage: StorageLike | null = getDefaultStorage(),
): void {
  if (!storage) return;
  try {
    if (address) {
      storage.setItem(ACTIVE_ADDRESS_KEY, address);
    } else {
      storage.removeItem(ACTIVE_ADDRESS_KEY);
    }
  } catch {
    // Ignore storage failures
  }
}
