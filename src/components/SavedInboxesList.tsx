import { Flame } from 'lucide-react';
import { formatRelativeTime } from '../lib/mail/format';
import { MAX_SAVED_INBOXES } from '../lib/mail/storage';
import type { SavedInbox } from '../lib/mail/types';

type SavedInboxesListProps = {
  inboxes: SavedInbox[];
  activeAddress: string | null;
  isBurning: boolean;
  onSelect: (address: string) => void;
  onBurn: (address: string) => void;
};

export function SavedInboxesList({
  inboxes,
  activeAddress,
  isBurning,
  onSelect,
  onBurn,
}: SavedInboxesListProps) {
  return (
    <aside
      aria-label="Saved inboxes"
      className="border-b border-slate-200 bg-white lg:w-[270px] lg:shrink-0 lg:border-r lg:border-b-0"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-xs font-semibold tracking-wide text-slate-700">
          Saved inboxes
        </h2>
        <span className="font-mono text-xs text-slate-500 tabular-nums">
          {inboxes.length}/{MAX_SAVED_INBOXES}
        </span>
      </div>

      {inboxes.length === 0 ? (
        <div className="px-4 py-6 text-xs text-slate-500">
          Your last {MAX_SAVED_INBOXES} disposable addresses are saved locally in this browser.
        </div>
      ) : (
        <ul className="flex flex-row gap-1.5 overflow-x-auto p-2 lg:flex-col lg:gap-1 lg:overflow-x-visible">
          {inboxes.map((inbox) => {
            const isActive =
              activeAddress?.toLowerCase() === inbox.address.toLowerCase();
            return (
              <li
                key={inbox.address}
                className={`group flex items-center gap-1 rounded-lg border transition-colors shrink-0 lg:shrink ${
                  isActive
                    ? 'border-blue-200 bg-blue-50/70'
                    : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(inbox.address)}
                  aria-current={isActive ? 'true' : undefined}
                  className="min-w-0 flex-1 px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600 rounded-lg"
                >
                  <div
                    className={`truncate font-mono text-xs font-medium max-w-[180px] lg:max-w-none ${
                      isActive ? 'text-blue-900' : 'text-slate-800'
                    }`}
                  >
                    {inbox.address}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                    Created {formatRelativeTime(inbox.createdAt)}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onBurn(inbox.address)}
                  disabled={isBurning}
                  aria-label={`Burn ${inbox.address}`}
                  title={`Burn ${inbox.address}`}
                  className="mr-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-red-600"
                >
                  <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
