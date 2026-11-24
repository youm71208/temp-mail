import { MailPlus, RefreshCw } from 'lucide-react';

type TopBarProps = {
  hasActiveInbox: boolean;
  isCreating: boolean;
  isRefreshing: boolean;
  secondsUntilPoll: number;
  onRefresh: () => void;
  onCreateRandom: () => void;
};

export function TopBar({
  hasActiveInbox,
  isCreating,
  isRefreshing,
  secondsUntilPoll,
  onRefresh,
  onCreateRandom,
}: TopBarProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <a
          href="/"
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded"
        >
          Postlet
        </a>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {hasActiveInbox && (
            <span className="hidden sm:inline text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
              {isRefreshing ? 'Checking mail...' : `Next check in ${secondsUntilPoll}s`}
            </span>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={!hasActiveInbox || isRefreshing}
            aria-label="Refresh inbox"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onCreateRandom}
            disabled={isCreating}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <MailPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isCreating ? 'Creating...' : 'New inbox'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
