"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Chat, type ChatMessage } from "../../../components/Chat";
import { useMessages } from "../../../hooks/useMessages";
import { useThreads } from "../../../hooks/useThreads";
import { useToast } from "../../../components/Toast";
import { useThreadSelection } from "../../../context/ThreadSelection";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = params.id as string;
  const initialMessage = searchParams.get('message');
  const { threads, refresh: refreshThreads } = useThreads();
  const { setSelectedId } = useThreadSelection();
  const {
    messages,
    sendUserMessage,
    refresh,
    loadMore,
    hasMore,
    isLoadingMore,
    togglePin,
  } = useMessages(chatId);
  const [pending, setPending] = useState<ChatMessage | null>(null);
  // Optimistic user bubble while POST in-flight
  const [optimisticUser, setOptimisticUser] = useState<ChatMessage | null>(null);
  const { show } = useToast();

  // Set the selected thread ID when component mounts
  useEffect(() => {
    if (chatId) {
      setSelectedId(chatId);
    }
  }, [chatId, setSelectedId]);

  // Do not redirect away if thread list hasn't caught up yet; avoid flicker.
  // We rely on message posting to surface errors for invalid IDs.

  const onSend = useCallback(async (text: string) => {
    const useThreadId = chatId;
    if (!useThreadId) return;

    // Optimistically show the user's message immediately
    setOptimisticUser({
      id: "optimistic-user",
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    });

    // Persist user message
    const post = await fetch("/api/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        threadId: useThreadId,
        role: "user",
        content: text,
      }),
    });
    if (!post.ok) {
      try {
        const err = await post.json();
        show(err.error ?? "Failed to send message", "error");
      } catch {
        show("Failed to send message", "error");
      }
      // Rollback optimistic user message on failure
      setOptimisticUser(null);
      return;
    }

    // Do not refresh yet to avoid showing both optimistic and persisted duplicates

    // Stream assistant echo from /api/chat
    const t = threads.find((x) => x.id === useThreadId);
    const selectedModel = t?.defaultModel ?? "gemini-2.0-flash";
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        threadId: useThreadId,
        messages: [{ role: "user", content: text }],
        model: selectedModel,
      }),
    });
    if (!res.ok) {
      try {
        const err = await res.json();
        show(err.error ?? "Chat request failed", "error");
      } catch {
        show("Chat request failed", "error");
      }
      // Clear optimistic user if streaming fails; persisted message is already saved
      setOptimisticUser(null);
      return;
    }
    const reader = res.body?.getReader();
    if (!reader) return;
    let acc = "";
    setPending({
      id: "pending",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    });
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += new TextDecoder().decode(value);
      setPending({
        id: "pending",
        role: "assistant",
        content: acc,
        createdAt: new Date().toISOString(),
      });
    }
    // Background revalidate messages and threads; keep UI stable until data lands
    refresh();
    refreshThreads();
  }, [chatId, threads, refresh, refreshThreads, show]);

  // Handle initial message from URL params (when coming from home page)
  // Guard against double-invocation in React Strict Mode
  const initRef = useRef<{ id: string; sent: boolean }>({ id: chatId, sent: false });
  useEffect(() => {
    if (initRef.current.id !== chatId) initRef.current = { id: chatId, sent: false };
    if (initialMessage && messages.length === 0 && !initRef.current.sent) {
      initRef.current.sent = true;
      // Clear the URL param and send the message
      router.replace(`/chat/${chatId}`, { scroll: false });
      onSend(initialMessage);
    }
  }, [initialMessage, messages.length, chatId, router, onSend]);

  // Optimistically add the user's message, then pending assistant while streaming
  const merged = useMemo(() => {
    const base = optimisticUser ? [...messages, optimisticUser] : messages;
    return pending ? [...base, pending] : base;
  }, [messages, optimisticUser, pending]);

  // Clear optimistic user once it appears in the persisted list
  useEffect(() => {
    if (!optimisticUser) return;
    const found = messages.some(
      (m) => m.role === "user" && m.content === optimisticUser.content,
    );
    if (found) setOptimisticUser(null);
  }, [messages, optimisticUser]);

  // Clear pending once the server-persisted assistant message is present
  useEffect(() => {
    if (!pending) return;
    const found = messages.some(
      (m) => m.role === "assistant" && m.content === pending.content,
    );
    if (found) setPending(null);
  }, [messages, pending]);

  const handleRegenerate = async () => {
    // Find the last user message and last assistant message
    const lastUserMessage = messages.filter(m => m.role === "user").pop();
    const lastAssistantMessage = messages.filter(m => m.role === "assistant").pop();
    
    if (!lastUserMessage) return;

    // Delete the last assistant message if it exists
    if (lastAssistantMessage) {
      try {
        const deleteRes = await fetch(`/api/messages?id=${lastAssistantMessage.id}`, {
          method: "DELETE",
        });
        if (!deleteRes.ok) {
          show("Failed to delete previous response", "error");
          return;
        }
        // Refresh messages to reflect the deletion
        await refresh();
      } catch {
        show("Failed to delete previous response", "error");
        return;
      }
    }

    // Re-send the last user message to generate a new response
    await onSend(lastUserMessage.content);
  };

  return (
    <div className="h-full min-h-0">
      <Chat
        messages={merged}
        onSend={onSend}
        onRegenerate={handleRegenerate}
        isStreaming={!!pending}
        onLoadMoreTop={loadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onTogglePin={(id, next) => togglePin(id, next)}
      />
    </div>
  );
}
