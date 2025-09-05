"use client";
import { useEffect, useMemo, useState, useCallback, useRef, startTransition } from "react";
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

  // Smooth typewriter reveal state (decouples network chunking from UI updates)
  const typewriterRef = useRef<{
    buffer: string; // text waiting to be revealed
    rendered: string; // text already revealed
    timer: number; // active interval id (0 if idle)
    done: boolean; // network stream completed
    final: string; // final full content when done
  }>({ buffer: "", rendered: "", timer: 0, done: false, final: "" });

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

    // Initialize pending assistant bubble and typewriter state
    setPending({
      id: "pending",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    });
    // Cancel any prior animation if somehow still running
    if (typewriterRef.current.timer) {
      window.clearInterval(typewriterRef.current.timer);
    }
    typewriterRef.current = {
      buffer: "",
      rendered: "",
      done: false,
      final: "",
      timer: 0,
    };

    const decoder = new TextDecoder();
    const TICK_MS = 33; // ~30fps
    const CHARS_PER_TICK = 3; // reveal a few chars per tick

    const tick = () => {
      const tw = typewriterRef.current;
      let changed = false;
      if (tw.buffer.length > 0) {
        const n = Math.min(tw.buffer.length, CHARS_PER_TICK);
        const chunk = tw.buffer.slice(0, n);
        tw.buffer = tw.buffer.slice(n);
        tw.rendered += chunk;
        changed = true;
      }

      if (changed) {
        // Mark this as a transition to keep typing smooth
        startTransition(() => {
          setPending({
            id: "pending",
            role: "assistant",
            content: tw.rendered,
            createdAt: new Date().toISOString(),
          });
        });
      }

      if (tw.buffer.length === 0 && tw.done) {
        if (tw.rendered !== tw.final) {
          const finalText = tw.final;
          startTransition(() => {
            setPending({
              id: "pending",
              role: "assistant",
              content: finalText,
              createdAt: new Date().toISOString(),
            });
          });
        }
        if (typewriterRef.current.timer) {
          window.clearInterval(typewriterRef.current.timer);
          typewriterRef.current.timer = 0;
        }
        // Revalidate after finishing to swap in persisted message
        refresh();
        refreshThreads();
      }
    };

    // Read network stream and feed the typewriter buffer
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        const tw = typewriterRef.current;
        tw.done = true;
        break;
      }
      const delta = decoder.decode(value, { stream: true });
      if (!delta) continue;
      const tw = typewriterRef.current;
      tw.buffer += delta;
      tw.final += delta;
      if (tw.timer === 0) {
        tw.timer = window.setInterval(tick, TICK_MS);
      }
    }
  }, [chatId, threads, refresh, refreshThreads, show]);

  // Cleanup on unmount: cancel any pending rAF to avoid leaks
  useEffect(() => {
    return () => {
      if (typewriterRef.current.timer) window.clearInterval(typewriterRef.current.timer);
    };
  }, []);

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
