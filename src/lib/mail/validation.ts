import type { MailResult } from './types';

const ADJECTIVES = [
  'amber',
  'brisk',
  'cedar',
  'clear',
  'coral',
  'crisp',
  'delta',
  'flint',
  'frost',
  'hazel',
  'ivory',
  'lumen',
  'maple',
  'misty',
  'noble',
  'olive',
  'pebble',
  'quiet',
  'river',
  'slate',
  'solar',
  'stone',
  'swift',
  'linen',
];

const NOUNS = [
  'brook',
  'cairn',
  'cloud',
  'crest',
  'finch',
  'flare',
  'grove',
  'heron',
  'larch',
  'marsh',
  'otter',
  'plume',
  'quail',
  'reed',
  'ridge',
  'robin',
  'spark',
  'spire',
  'swift',
  'thorn',
  'trail',
  'vale',
  'wren',
  'zephyr',
];

const LOCAL_PART_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/;

export function generateRandomLocalPart(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${adj}.${noun}.${suffix}`;
}

export function generateRandomPassword(length = 20): string {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const chars: string[] = [];
  for (let i = 0; i < length; i += 1) {
    chars.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
  }
  return chars.join('');
}

export function cleanLocal(raw?: string): MailResult<string> {
  if (raw === undefined || raw.trim() === '') {
    return { ok: true, data: generateRandomLocalPart() };
  }

  const normalized = raw.trim().toLowerCase();

  if (normalized.includes('@')) {
    return {
      ok: false,
      error: 'Enter only the name before the @ sign.',
    };
  }

  if (normalized.length < 3 || normalized.length > 32) {
    return {
      ok: false,
      error: 'Address name must be between 3 and 32 characters.',
    };
  }

  if (normalized.includes('..')) {
    return {
      ok: false,
      error: 'Address name cannot contain consecutive dots.',
    };
  }

  if (!LOCAL_PART_PATTERN.test(normalized)) {
    return {
      ok: false,
      error:
        'Use letters, numbers, dots, hyphens, or underscores, starting and ending with a letter or number.',
    };
  }

  return { ok: true, data: normalized };
}
