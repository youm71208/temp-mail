import type { ExtractedCode } from './types';

const CONTEXT_KEYWORD_REGEX =
  /\b(?:otp|code|pin|passcode|verification|verify|confirm(?:ation)?|token|auth(?:entication)?|security|one[-\s]?time|2fa|mfa|login|sign[-\s]?in)\b/i;

const EXPLICIT_NUMERIC_REGEX =
  /\b(?:otp|code|pin|passcode|verification(?:\s+code)?|security(?:\s+code)?|one[-\s]?time(?:\s+(?:code|password|pin))?|auth(?:entication)?(?:\s+code)?|2fa|mfa)\b\s*(?:is|:|=|-|\s){0,4}\s*([0-9]{4,8}|[0-9]{3}[-\s][0-9]{3})\b/gi;

const EXPLICIT_ALPHANUM_REGEX =
  /\b(?:otp|code|passcode|verification(?:\s+code)?|confirmation(?:\s+code)?)\b\s*(?:is|:|=)\s*([A-Z0-9]{5,8})\b/g;

const STANDALONE_NUMERIC_REGEX = /(?:^|[\s(>:"'])([0-9]{4,8})(?=$|[\s)<.,:;"'!?])/g;

function stripHtmlTags(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyYearOrFalsePositive(token: string): boolean {
  if (/^(19\d\d|20[0-3]\d)$/.test(token)) {
    return true;
  }
  if (/^0+$/.test(token)) {
    return true;
  }
  return false;
}

export function extractVerificationCodes(input: {
  subject?: string;
  text?: string;
  html?: string[];
}): ExtractedCode[] {
  const rawHtml = Array.isArray(input.html) ? input.html.join('\n') : '';
  const plainFromHtml = rawHtml ? stripHtmlTags(rawHtml) : '';
  const combined = [input.subject ?? '', input.text ?? '', plainFromHtml]
    .filter((part) => part.trim().length > 0)
    .join('\n');

  if (!combined) return [];

  const found = new Map<string, ExtractedCode>();

  for (const match of combined.matchAll(EXPLICIT_NUMERIC_REGEX)) {
    const rawCode = match[1]?.replace(/[-\s]/g, '');
    if (!rawCode || rawCode.length < 4 || rawCode.length > 8) continue;
    if (!found.has(rawCode)) {
      found.set(rawCode, {
        code: rawCode,
        kind: 'numeric',
        confidence: 'high',
      });
    }
  }

  for (const match of combined.matchAll(EXPLICIT_ALPHANUM_REGEX)) {
    const rawCode = match[1];
    if (!rawCode) continue;
    const hasDigit = /\d/.test(rawCode);
    const hasLetter = /[A-Z]/.test(rawCode);
    if (hasDigit && hasLetter && !found.has(rawCode)) {
      found.set(rawCode, {
        code: rawCode,
        kind: 'alphanumeric',
        confidence: 'high',
      });
    }
  }

  const hasVerificationContext = CONTEXT_KEYWORD_REGEX.test(combined);
  if (hasVerificationContext) {
    for (const match of combined.matchAll(STANDALONE_NUMERIC_REGEX)) {
      const token = match[1];
      if (!token) continue;
      const idx = match.index ?? 0;
      const lineStart = combined.lastIndexOf('\n', idx) + 1;
      const lineEndIdx = combined.indexOf('\n', idx);
      const lineEnd = lineEndIdx === -1 ? combined.length : lineEndIdx;
      const sameLine = combined.slice(lineStart, lineEnd);

      // Skip CSS hex / time / dollar amounts
      const charBefore = idx > 0 ? combined[idx - 1] : '';
      if (charBefore === '#' || charBefore === '$' || charBefore === ':') {
        continue;
      }

      if (isLikelyYearOrFalsePositive(token)) {
        continue;
      }

      if (!found.has(token)) {
        found.set(token, {
          code: token,
          kind: 'numeric',
          confidence: CONTEXT_KEYWORD_REGEX.test(sameLine) ? 'high' : 'medium',
        });
      }
    }
  }

  return Array.from(found.values()).slice(0, 4);
}
