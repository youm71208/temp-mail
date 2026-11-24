import { AlertCircle, X } from 'lucide-react';
import { useInbox } from '../lib/mail/use-inbox';
import { AddressStrip } from './AddressStrip';
import { MessageList } from './MessageList';
import { MessageReader } from './MessageReader';
import { SavedInboxesList } from './SavedInboxesList';
import { TopBar } from './TopBar';

export function PostletApp() {
  const {
    inboxes,
    activeInbox,
    domains,
    messages,
    selectedMessageId,
    selectedMessage,
    isInitializing,
    isCreating,
    isRefreshing,
    isLoadingMessage,
    isBurning,
    deletingMessageId,
    error,
    secondsUntilPoll,
    createNewInbox,
    refreshMessages,
    selectInbox,
    openMessage,
    clearSelectedMessage,
    removeMessage,
    burnSelectedInbox,
    dismissError,
  } = useInbox();

  const isReadingOnMobile = Boolean(selectedMessageId);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <TopBar
        hasActiveInbox={Boolean(activeInbox)}
        isCreating={isCreating}
        isRefreshing={isRefreshing}
        secondsUntilPoll={secondsUntilPoll}
        onRefresh={() => void refreshMessages()}
        onCreateRandom={() => void createNewInbox()}
      />

      <AddressStrip
        activeInbox={activeInbox}
        domains={domains}
        isInitializing={isInitializing}
        isCreating={isCreating}
        isBurning={isBurning}
        onCreateCustom={(localPart, domain) =>
          createNewInbox({ localPart, domain })
        }
        onBurnActive={() => burnSelectedInbox()}
      />

      {error && (
        <div
          role="alert"
          className="border-b border-red-200 bg-red-50 px-4 py-2.5 sm:px-6"
        >
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={dismissError}
              aria-label="Dismiss error"
              className="inline-flex h-7 w-7 items-center justify-center rounded text-red-700 hover:bg-red-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col lg:flex-row lg:border-x lg:border-slate-200 bg-white">
        <SavedInboxesList
          inboxes={inboxes}
          activeAddress={activeInbox?.address ?? null}
          isBurning={isBurning}
          onSelect={(address) => void selectInbox(address)}
          onBurn={(address) => void burnSelectedInbox(address)}
        />

        <div
          className={`${isReadingOnMobile ? 'hidden lg:flex' : 'flex'} flex-1 flex-col lg:flex-none`}
        >
          <MessageList
            messages={messages}
            selectedMessageId={selectedMessageId}
            isLoading={isInitializing || (isRefreshing && messages.length === 0)}
            isRefreshing={isRefreshing}
            hasActiveInbox={Boolean(activeInbox)}
            onSelectMessage={(id) => void openMessage(id)}
            onRefresh={() => void refreshMessages()}
          />
        </div>

        <div
          className={`${isReadingOnMobile ? 'flex' : 'hidden lg:flex'} min-w-0 flex-1 flex-col`}
        >
          <MessageReader
            message={selectedMessage}
            isLoading={isLoadingMessage}
            isDeleting={Boolean(
              selectedMessage && deletingMessageId === selectedMessage.id,
            )}
            hasMessages={messages.length > 0}
            onBack={clearSelectedMessage}
            onDelete={(id) => void removeMessage(id)}
          />
        </div>
      </main>
    </div>
  );
}
