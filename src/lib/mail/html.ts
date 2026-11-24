const DANGEROUS_PAIRED_TAGS = [
  'script',
  'noscript',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'form',
  'textarea',
  'select',
  'button',
  'svg',
];

const DANGEROUS_VOID_TAGS = ['base', 'meta', 'link', 'input'];

export function sanitizeMailHtml(rawHtml: string | string[]): string {
  const source = Array.isArray(rawHtml) ? rawHtml.join('\n') : rawHtml;
  if (!source) return '';

  let clean = source;

  // Remove HTML comments that could hide conditional tags
  clean = clean.replace(/<!--[\s\S]*?-->/g, '');

  // Strip dangerous paired tags and their contents
  for (const tag of DANGEROUS_PAIRED_TAGS) {
    const pairedRegex = new RegExp(
      `<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`,
      'gi',
    );
    clean = clean.replace(pairedRegex, '');
    const selfClosingOrUnclosed = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
    clean = clean.replace(selfClosingOrUnclosed, '');
  }

  // Strip dangerous void tags
  for (const tag of DANGEROUS_VOID_TAGS) {
    const voidRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    clean = clean.replace(voidRegex, '');
  }

  // Strip inline event handlers (onclick, onload, onerror, etc.)
  clean = clean.replace(
    /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    '',
  );

  // Strip srcdoc attributes
  clean = clean.replace(
    /\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    '',
  );

  // Neutralize javascript:, vbscript:, and data:text/html URLs in href/src/action/poster
  clean = clean.replace(
    /(\s(?:href|src|action|poster|xlink:href)\s*=\s*)(["']?)\s*(?:javascript|vbscript|data:text\/html)[^"'\s>]*\2/gi,
    '$1$2#$2',
  );

  // Remove CSS expression() or @import inside style tags/attributes
  clean = clean.replace(/expression\s*\([^)]*\)/gi, '');
  clean = clean.replace(/@import\b[^;]+;?/gi, '');

  // Ensure external links open safely in a new tab
  clean = clean.replace(/<a\b([^>]*)>/gi, (_match, attrs: string) => {
    const withoutTarget = attrs
      .replace(/\s+target\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\s+rel\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    return `<a${withoutTarget} target="_blank" rel="noopener noreferrer nofollow">`;
  });

  return clean.trim();
}

export function buildSandboxedMailDocument(sanitizedHtml: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #0f172a;
      background: #ffffff;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    img { max-width: 100%; height: auto; }
    table { max-width: 100%; }
    a { color: #1d4ed8; }
    pre, code {
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>${sanitizedHtml}</body>
</html>`;
}

export function htmlToPlainText(rawHtml: string | string[]): string {
  const sanitized = sanitizeMailHtml(rawHtml);
  return sanitized
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
