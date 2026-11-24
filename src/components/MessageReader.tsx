import {
  ArrowLeft,
  Check,
  Copy,
  MailOpen,
  Paperclip,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { extractVerificationCodes } from '../lib/mail/codes';
import {
  formatByteSize,
  formatExactTimestamp,
  formatSenderLabel,
} from '../lib/mail/format';
import {
  buildSandboxedMailDocument,
  htmlToPlainText,
  sanitizeMailHtml,
} from '../lib/mail/html';
import type { MessageDetail } from '../lib/mail/types';

type MessageReaderProps = {
  message: MessageDetail | null;
  isLoading: boolean;
  isDeleting: boolean;
  hasMessages: boolean;
  onBack: () => void;
  onDelete: (id: string) => void;
};

export function MessageReader({
  message,
  isLoading,
  isDeleting,
  hasMessages,
  onBack,
  onDelete,
}: MessageReaderProps) {
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const hasHtml = Boolean(message?.html && message.html.length > 0);

  useEffect(() => {
    setViewMode(hasHtml ? 'html' : 'text');
    setCopiedCode(null);
  }, [message?.id, hasHtml]);

  const detectedCodes = useMemo(() => {
    if (!message) return [];
    return extractVerificationCodes({
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }, [message]);

  const sanitizedDocument = useMemo(() => {
    if (!message || !hasHtml) return '';
    return buildSandboxedMailDocument(sanitizeMailHtml(message.html));
  }, [message, hasHtml]);

  const plainBody = useMemo(() => {
    if (!message) return '';
    if (message.text?.trim()) return message.text;
    if (hasHtml) return htmlToPlainText(message.html);
    return message.intro || '';
  }, [message, hasHtml]);

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 2000);
    }
  }

  if (isLoading) {
    return (
      <section
        aria-label="Letter viewer"
        className="flex-1 bg-white p-6"
        aria-busy="true"
      >
        <div className="space-y-4 max-w-2xl">
          <div className="h-7 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="mt-6 space-y-2 border-t border-slate-200 pt-6">
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </section>
    );
  }

  if (!message) {
    return (
      <section
        aria-label="Letter viewer"
        className="hidden flex-1 flex-col items-center justify-center bg-slate-50/50 px-8 py-16 text-center lg:flex"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400">
          <MailOpen className="h-5 w-5" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          {hasMessages ? 'Select a letter to read' : 'No letter selected'}
        </h3>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
          {hasMessages
            ? 'Choose any message from your inbox list to view its contents and extract verification codes.'
            : 'Incoming messages appear automatically as soon as they arrive. Any verification codes inside are surfaced for one-click copying.'}
        </p>
      </section>
    );
  }

  const sender = formatSenderLabel(message.from);
  const recipients =
    message.to?.map((item) => item.address).filter(Boolean).join(', ') || '';

  return (
    <section
      aria-label="Letter viewer"
      className="flex min-w-0 flex-1 flex-col bg-white"
    >
      <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 mb-3 lg:hidden">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to inbox</span>
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900 [text-wrap:balance] sm:text-xl">
            {message.subject || '(No subject)'}
          </h2>

          <div className="flex items-center gap-2 shrink-0">
            {hasHtml && (
              <div
                role="tablist"
                aria-label="Letter display format"
                className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'html'}
                  onClick={() => setViewMode('html')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    viewMode === 'html'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Formatted
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'text'}
                  onClick={() => setViewMode('text')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    viewMode === 'text'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Plain text
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => onDelete(message.id)}
              disabled={isDeleting}
              aria-label={`Delete letter ${message.subject || ''}`.trim()}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:border-red-200 hover:bg-red-50 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
          <span className="font-medium text-slate-900">{sender.primary}</span>
          {sender.secondary && (
            <span className="font-mono text-slate-500">
              &lt;{sender.secondary}&gt;
            </span>
          )}
          {recipients && (
            <>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>
                To <span className="font-mono text-slate-700">{recipients}</span>
              </span>
            </>
          )}
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="font-mono text-slate-500 tabular-nums">
            {formatExactTimestamp(message.createdAt)}
          </span>
        </div>
      </div>

      {detectedCodes.length > 0 && (
        <div
          data-testid="otp-bar"
          className="border-b border-blue-200 bg-blue-50/70 px-4 py-3 sm:px-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-blue-900">
              Verification {detectedCodes.length === 1 ? 'code' : 'codes'} detected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {detectedCodes.map((item) => {
                const isCopied = copiedCode === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleCopyCode(item.code)}
                    className={`inline-flex min-h-[36px] items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-sm font-semibold tracking-wider transition-colors whitespace-nowrap ${
                      isCopied
                        ? 'border-emerald-300 bg-emerald-600 text-white'
                        : 'border-blue-300 bg-white text-blue-900 hover:bg-blue-100/70'
                    }`}
                  >
                    <span>{item.code}</span>
                    {isCopied ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {message.attachments && message.attachments.length > 0 && (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Attachments</span>
            </span>
            {message.attachments.map((att) => (
              <span key={att.id} className="font-mono text-slate-700">
                {att.filename}{' '}
                <span className="text-slate-500 tabular-nums">
                  ({formatByteSize(att.size)})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-white">
        {viewMode === 'html' && hasHtml ? (
          <iframe
            title={message.subject || 'Email message content'}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            srcDoc={sanitizedDocument}
            className="h-full min-h-[420px] w-full border-0 bg-white"
          />
        ) : (
          <div className="p-4 sm:p-6">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-800">
              {plainBody || '(Empty message body)'}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}
