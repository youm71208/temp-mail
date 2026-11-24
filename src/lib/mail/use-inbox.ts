import { useCallback, useEffect, useRef, useState } from 'react';
import {
  burnInbox,
  createInbox,
  deleteMessage,
  getActiveDomains,
  listMessages,
  readMessage,
  refreshInboxToken,
} from './functions';
import {
  loadActiveAddress,
  loadSavedInboxes,
  removeSavedInbox,
  saveActiveAddress,
  saveInboxes,
  upsertSavedInbox,
} from './storage';
import type { MessageDetail, MessageSummary, SavedInbox } from './types';

export const POLL_INTERVAL_SECONDS = 8;

export function useInbox() {
  const [inboxes, setInboxes] = useState<SavedInbox[]>(() =>
    loadSavedInboxes(),
  );
  const [activeInbox, setActiveInbox] = useState<SavedInbox | null>(() => {
    const saved = loadSavedInboxes();
    if (saved.length === 0) return null;
    const savedAddress = loadActiveAddress();
    return (
      saved.find(
        (item) => item.address.toLowerCase() === savedAddress?.toLowerCase(),
      ) ?? saved[0]
    );
  });

  const [domains, setDomains] = useState<string[]>([]);
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [selectedMessage, setSelectedMessage] = useState<MessageDetail | null>(
    null,
  );

  const [isInitializing, setIsInitializing] = useState<boolean>(
    () => loadSavedInboxes().length === 0,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [secondsUntilPoll, setSecondsUntilPoll] = useState<number>(
    POLL_INTERVAL_SECONDS,
  );

  const activeInboxRef = useRef<SavedInbox | null>(activeInbox);
  activeInboxRef.current = activeInbox;

  const isFetchingListRef = useRef(false);
  const didBootstrapRef = useRef(false);

  const updateInboxToken = useCallback((address: string, newToken: string) => {
    setInboxes((prev) => {
      const updated = prev.map((item) =>
        item.address.toLowerCase() === address.toLowerCase()
          ? { ...item, token: newToken }
          : item,
      );
      saveInboxes(updated);
      return updated;
    });

    setActiveInbox((prev) =>
      prev && prev.address.toLowerCase() === address.toLowerCase()
        ? { ...prev, token: newToken }
        : prev,
    );
  }, []);

  const fetchMessagesForInbox = useCallback(
    async (inbox: SavedInbox, silent = false) => {
      if (isFetchingListRef.current) return;
      isFetchingListRef.current = true;
      if (!silent) {
        setIsRefreshing(true);
      }

      try {
        let result = await listMessages(inbox.token);
        if (!result.ok && result.status === 401 && inbox.password) {
          const refreshed = await refreshInboxToken({
            address: inbox.address,
            password: inbox.password,
          });
          if (refreshed.ok) {
            updateInboxToken(inbox.address, refreshed.data.token);
            result = await listMessages(refreshed.data.token);
          }
        }

        // Guard against race if user switched inbox mid-flight
        if (
          activeInboxRef.current?.address.toLowerCase() !==
          inbox.address.toLowerCase()
        ) {
          return;
        }

        if (!result.ok) {
          if (!silent) {
            setError(result.error);
          }
          return;
        }

        setMessages(result.data);
        if (!silent) {
          setError(null);
        }
      } finally {
        isFetchingListRef.current = false;
        setIsRefreshing(false);
        setSecondsUntilPoll(POLL_INTERVAL_SECONDS);
      }
    },
    [updateInboxToken],
  );

  const createNewInbox = useCallback(
    async (options?: { localPart?: string; domain?: string }) => {
      setIsCreating(true);
      setError(null);
      const res = await createInbox(options);
      setIsCreating(false);

      if (!res.ok) {
        setError(res.error);
        return res;
      }

      const nextList = upsertSavedInbox(res.data);
      setInboxes(nextList);
      setActiveInbox(res.data);
      saveActiveAddress(res.data.address);
      setMessages([]);
      setSelectedMessageId(null);
      setSelectedMessage(null);
      setSecondsUntilPoll(POLL_INTERVAL_SECONDS);
      return res;
    },
    [],
  );

  // Initial domains + auto-provision first inbox if storage is empty
  useEffect(() => {
    if (didBootstrapRef.current) return;
    didBootstrapRef.current = true;

    void getActiveDomains().then((res) => {
      if (res.ok) {
        setDomains(res.data);
      }
    });

    const existing = activeInboxRef.current;
    if (existing) {
      saveActiveAddress(existing.address);
      void fetchMessagesForInbox(existing, false);
      setIsInitializing(false);
      return;
    }

    void (async () => {
      setIsInitializing(true);
      await createNewInbox();
      setIsInitializing(false);
    })();
  }, [createNewInbox, fetchMessagesForInbox]);

  // 8-second auto-poll loop
  useEffect(() => {
    if (!activeInbox) return;

    const tick = window.setInterval(() => {
      setSecondsUntilPoll((prev) => {
        if (prev <= 1) {
          if (activeInboxRef.current) {
            void fetchMessagesForInbox(activeInboxRef.current, true);
          }
          return POLL_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(tick);
  }, [activeInbox?.address, fetchMessagesForInbox]);

  const refreshMessages = useCallback(async () => {
    if (!activeInboxRef.current) return;
    await fetchMessagesForInbox(activeInboxRef.current, false);
  }, [fetchMessagesForInbox]);

  const selectInbox = useCallback(
    async (address: string) => {
      const target = inboxes.find(
        (item) => item.address.toLowerCase() === address.toLowerCase(),
      );
      if (!target) return;
      setActiveInbox(target);
      saveActiveAddress(target.address);
      setMessages([]);
      setSelectedMessageId(null);
      setSelectedMessage(null);
      setError(null);
      await fetchMessagesForInbox(target, false);
    },
    [fetchMessagesForInbox, inboxes],
  );

  const openMessage = useCallback(
    async (messageId: string) => {
      const current = activeInboxRef.current;
      if (!current) return;

      setSelectedMessageId(messageId);
      setIsLoadingMessage(true);
      setError(null);

      let res = await readMessage(current.token, messageId);
      if (!res.ok && res.status === 401 && current.password) {
        const refreshed = await refreshInboxToken({
          address: current.address,
          password: current.password,
        });
        if (refreshed.ok) {
          updateInboxToken(current.address, refreshed.data.token);
          res = await readMessage(refreshed.data.token, messageId);
        }
      }

      setIsLoadingMessage(false);

      if (
        activeInboxRef.current?.address.toLowerCase() !==
        current.address.toLowerCase()
      ) {
        return;
      }

      if (!res.ok) {
        setError(res.error);
        return;
      }

      setSelectedMessage(res.data);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, seen: true } : m)),
      );
    },
    [updateInboxToken],
  );

  const clearSelectedMessage = useCallback(() => {
    setSelectedMessageId(null);
    setSelectedMessage(null);
  }, []);

  const removeMessage = useCallback(async (messageId: string) => {
    const current = activeInboxRef.current;
    if (!current) return;

    setDeletingMessageId(messageId);
    const res = await deleteMessage(current.token, messageId);
    setDeletingMessageId(null);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setSelectedMessageId((prev) => (prev === messageId ? null : prev));
    setSelectedMessage((prev) => (prev?.id === messageId ? null : prev));
  }, []);

  const burnSelectedInbox = useCallback(
    async (addressToBurn?: string) => {
      const targetAddress = addressToBurn ?? activeInboxRef.current?.address;
      if (!targetAddress) return;

      const target = inboxes.find(
        (item) => item.address.toLowerCase() === targetAddress.toLowerCase(),
      );
      if (!target) return;

      setIsBurning(true);
      setError(null);

      // Attempt remote deletion on mail.tm (ignore 404/401 if already expired)
      const res = await burnInbox(target.token, target.accountId);
      if (!res.ok && res.status !== 404 && res.status !== 401) {
        setIsBurning(false);
        setError(res.error);
        return;
      }

      const remaining = removeSavedInbox(target.address);
      setInboxes(remaining);

      const burnedActive =
        activeInboxRef.current?.address.toLowerCase() ===
        target.address.toLowerCase();

      if (burnedActive) {
        setMessages([]);
        setSelectedMessageId(null);
        setSelectedMessage(null);

        if (remaining.length > 0) {
          const next = remaining[0];
          setActiveInbox(next);
          saveActiveAddress(next.address);
          setIsBurning(false);
          await fetchMessagesForInbox(next, false);
        } else {
          setActiveInbox(null);
          saveActiveAddress(null);
          await createNewInbox();
          setIsBurning(false);
        }
      } else {
        setIsBurning(false);
      }
    },
    [createNewInbox, fetchMessagesForInbox, inboxes],
  );

  const dismissError = useCallback(() => setError(null), []);

  return {
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
  };
}
