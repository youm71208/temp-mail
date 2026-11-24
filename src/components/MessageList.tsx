import { Inbox, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatRelativeTime, formatSenderLabel } from '../lib/mail/format';
import type { MessageSummary } from '../lib/mail/types';

type MessageListProps = {
  messages: MessageSummary[];
  selectedMessageId: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  hasActiveInbox: boolean;
  onSelectMessage: (id: string) => void;
  onRefresh: () => void;
};

export function MessageList({
  messages,
  selectedMessageId,
  isLoading,
  isRefreshing,
  hasActiveInbox,
  onSelectMessage,
  onRefresh,
}: MessageListProps) {
  const [query, setQuery] = useState('');

  const filteredMessages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((msg) => {
      const senderName = msg.from?.name?.toLowerCase() ?? '';
      const senderAddr = msg.from?.address?.toLowerCase() ?? '';
      const subject = msg.subject?.toLowerCase() ?? '';
      const intro = msg.intro?.toLowerCase() ?? '';
      return (
        senderName.includes(q) ||
        senderAddr.includes(q) ||
        subject.includes(q) ||
        intro.includes(q)
      );
    });
  }, [messages, query]);

  const unreadCount = useMemo(
    () => messages.filter((m) => !m.seen).length,
    [messages],
  );

  return (
    <section
      aria-label="Inbox messages"
      className="flex min-h-[380px] flex-1 flex-col border-b border-slate-200 bg-white lg:h-full lg:w-[370px] lg:shrink-0 lg:border-r lg:border-b-0"
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-slate-700">
            Inbox
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">
            {messages.length === 0
              ? 'No letters'
              : unreadCount > 0
                ? `${unreadCount} unread · ${messages.length} total`
                : `${messages.length} ${messages.length === 1 ? 'letter' : 'letters'}`}
          </span>
        </div>

        <div className="relative mt-2.5">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by sender or subject"
            aria-label="Filter inbox messages"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && messages.length === 0 ? (
          <div className="divide-y divide-slate-100 p-2" aria-busy="true">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="space-y-2 px-3 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="h-3.5 w-32 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-12 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
              <Inbox className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              Waiting for incoming mail
            </h3>
            <p className="mt-1.5 max-w-[260px] text-xs leading-relaxed text-slate-500">
              Copy your address above and send mail to it. Postlet checks for new letters every 8 seconds.
            </p>
            {hasActiveInbox && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{isRefreshing ? 'Checking...' : 'Check now'}</span>
              </button>
            )}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="px-6 py-10 text-center text-xs text-slate-500">
            No letters match &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100" data-testid="message-list">
            {filteredMessages.map((msg) => {
              const isSelected = selectedMessageId === msg.id;
              const sender = formatSenderLabel(msg.from);
              return (
                <li key={msg.id}>
                  <button
                    type="button"
                    onClick={() => onSelectMessage(msg.id)}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`w-full px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600 ${
                      isSelected
                        ? 'bg-blue-50/80'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {!msg.seen && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-blue-600"
                            aria-label="Unread"
                          />
                        )}
                        <span
                          className={`truncate text-xs ${
                            !msg.seen
                              ? 'font-semibold text-slate-900'
                              : 'font-medium text-slate-700'
                          }`}
                        >
                          {sender.primary}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-slate-500 tabular-nums">
                        {formatRelativeTime(msg.createdAt)}
                      </span>
                    </div>

                    <div
                      className={`mt-1 truncate text-sm ${
                        !msg.seen
                          ? 'font-semibold text-slate-900'
                          : 'font-medium text-slate-800'
                      }`}
                    >
                      {msg.subject || '(No subject)'}
                    </div>

                    {msg.intro && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                        {msg.intro}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
