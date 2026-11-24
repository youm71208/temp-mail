import { Check, Copy, Flame, PencilLine, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { SavedInbox } from '../lib/mail/types';
import { cleanLocal } from '../lib/mail/validation';

type AddressStripProps = {
  activeInbox: SavedInbox | null;
  domains: string[];
  isInitializing: boolean;
  isCreating: boolean;
  isBurning: boolean;
  onCreateCustom: (
    localPart: string,
    domain?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  onBurnActive: () => Promise<void>;
};

export function AddressStrip({
  activeInbox,
  domains,
  isInitializing,
  isCreating,
  isBurning,
  onCreateCustom,
  onBurnActive,
}: AddressStripProps) {
  const [copied, setCopied] = useState(false);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [localInput, setLocalInput] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmBurn, setConfirmBurn] = useState(false);

  useEffect(() => {
    setCopied(false);
    setConfirmBurn(false);
  }, [activeInbox?.address]);

  useEffect(() => {
    if (domains.length > 0 && !selectedDomain) {
      setSelectedDomain(domains[0]);
    }
  }, [domains, selectedDomain]);

  async function handleCopy() {
    if (!activeInbox) return;
    try {
      await navigator.clipboard.writeText(activeInbox.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for restricted clipboard contexts
      const textarea = document.createElement('textarea');
      textarea.value = activeInbox.address;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  async function handleCustomSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = localInput.trim();
    if (!trimmed) {
      setFormError('Enter an address name before creating.');
      return;
    }

    const validation = cleanLocal(trimmed);
    if (!validation.ok) {
      setFormError(validation.error);
      return;
    }

    setFormError(null);
    const res = await onCreateCustom(validation.data, selectedDomain || undefined);
    if (!res.ok) {
      setFormError(res.error ?? 'Could not create that address.');
      return;
    }

    setLocalInput('');
    setIsCustomOpen(false);
  }

  const displayDomain = selectedDomain || domains[0] || 'mail.tm';

  return (
    <section
      aria-label="Disposable email address"
      className="border-b border-slate-200 bg-white"
    >
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500">
              Active disposable address
            </p>
            {isInitializing && !activeInbox ? (
              <div className="mt-1.5 h-8 w-72 animate-pulse rounded bg-slate-100" />
            ) : activeInbox ? (
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span
                  data-testid="active-address"
                  className="font-mono text-base font-medium tracking-tight text-slate-900 sm:text-xl break-all select-all"
                >
                  {activeInbox.address}
                </span>
              </div>
            ) : (
              <p className="mt-1 text-sm text-slate-600">
                No inbox active. Create one to start receiving mail.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!activeInbox}
              className={`inline-flex min-h-[42px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 ${
                copied
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span>Copy address</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCustomOpen((prev) => !prev);
                setFormError(null);
              }}
              aria-expanded={isCustomOpen}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <PencilLine className="h-4 w-4" aria-hidden="true" />
              <span>Custom name</span>
            </button>

            {activeInbox && !confirmBurn && (
              <button
                type="button"
                onClick={() => setConfirmBurn(true)}
                disabled={isBurning}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-red-700 transition-colors hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                <Flame className="h-4 w-4" aria-hidden="true" />
                <span>Burn inbox</span>
              </button>
            )}

            {activeInbox && confirmBurn && (
              <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmBurn(false);
                    void onBurnActive();
                  }}
                  disabled={isBurning}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isBurning ? 'Burning...' : 'Confirm burn'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmBurn(false)}
                  disabled={isBurning}
                  aria-label="Cancel burn inbox"
                  className="inline-flex min-h-[34px] items-center rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {isCustomOpen && (
          <form
            onSubmit={handleCustomSubmit}
            className="mt-4 border-t border-slate-200 pt-4"
            noValidate
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 max-w-lg">
                <label
                  htmlFor="custom-local-part"
                  className="block text-xs font-medium text-slate-700"
                >
                  Choose a custom inbox name
                </label>
                <div className="mt-1.5 flex items-stretch overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
                  <input
                    id="custom-local-part"
                    type="text"
                    value={localInput}
                    onChange={(e) => {
                      setLocalInput(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. alex.verify.24"
                    autoComplete="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                  {domains.length > 1 ? (
                    <select
                      aria-label="Email domain"
                      value={displayDomain}
                      onChange={(e) => setSelectedDomain(e.target.value)}
                      className="border-l border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 focus:outline-none"
                    >
                      {domains.map((dom) => (
                        <option key={dom} value={dom}>
                          @{dom}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 select-none whitespace-nowrap">
                      @{displayDomain}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex min-h-[40px] items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {isCreating ? 'Creating...' : 'Create address'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomOpen(false);
                    setFormError(null);
                  }}
                  aria-label="Close custom name form"
                  className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {formError && (
              <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                {formError}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
