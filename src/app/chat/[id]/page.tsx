"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Chat, type ChatMessage } from "../../../components/Chat";
import type { Mode } from "../../../components/ModeToggle";
import { useToast } from "../../../components/Toast";
import { useSettings } from "../../../context/Settings";
import { useThreadSelection } from "../../../context/ThreadSelection";
import { useChatStream } from "../../../hooks/useChatStream";
import { useMessages } from "../../../hooks/useMessages";
import { useThreads } from "../../../hooks/useThreads";
import { getMcpSettings } from "../../../lib/client/mcp-client";
import { DEFAULT_SPEC } from "../../../lib/llm-config";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = params.id as string;
  const initialMessage = searchParams.get("message");
  const { threads, refresh: refreshThreads, validateThread } = useThreads();
  const { setSelectedId } = useThreadSelection();
  const {
    messages,
    refresh,
    togglePin,
    updateTickets,
    sendUserMessage,
    deleteMessage,
  } = useMessages(chatId);
  const { streamChat } = useChatStream();
  const [pending, setPending] = useState<ChatMessage | null>(null);
  // Optimistic user bubble while POST in-flight
  const [optimisticUser, setOptimisticUser] = useState<ChatMessage | null>(
    null,
  );
  const { show } = useToast();
  // Use a ref to track the actual current mode (survives hot reloads)
  const currentModeRef = useRef<Mode>("assistant");

  // Persist mode selection in localStorage (hydration-safe)
  const [mode, setMode] = useState<Mode>("assistant");
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved mode after hydration to avoid SSR mismatch
  useEffect(() => {
    setIsHydrated(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chat-mode");
      if (saved && (saved === "assistant" || saved === "ticket")) {
        const savedMode = saved as Mode;
        setMode(savedMode);
        currentModeRef.current = savedMode;
      }
    }
  }, []);

  // Persist mode to localStorage whenever it changes (only after hydration)
  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      localStorage.setItem("chat-mode", mode);
    }
  }, [mode, isHydrated]);
  const { spec: globalSpec } = useSettings();

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

  // Validate thread exists and redirect if invalid
  useEffect(() => {
    if (!chatId) return;

    const checkThread = async () => {
      const isValid = await validateThread(chatId);
      if (!isValid) {
        router.replace("/");
      }
    };

    checkThread();
  }, [chatId, validateThread, router]);

  const onSend = useCallback(
    async (text: string) => {
      const useThreadId = chatId;
      if (!useThreadId) return;

      // Optimistically show the user's message immediately
      setOptimisticUser({
        id: "optimistic-user",
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      });

      // Persist user message via hook
      try {
        await sendUserMessage(text);
      } catch (err) {
        // Check if this is a thread not found error
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (
          errorMessage.includes("Thread not found") ||
          errorMessage.includes("404")
        ) {
          // Thread doesn't exist, redirect to home
          router.replace("/");
          return;
        }
        show("Failed to send message", "error");
        setOptimisticUser(null);
        return;
      }

      // Do not refresh yet to avoid showing both optimistic and persisted duplicates

      // Initialize pending assistant bubble immediately to show loading
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

      // Stream assistant echo from /api/chat
      const t = threads.find((x) => x.id === useThreadId);
      const selectedModel = globalSpec || t?.defaultModel || DEFAULT_SPEC;
      const TICK_MS = 16; // ~60fps
      const CHARS_PER_TICK = 8; // reveal more chars per tick for faster streaming

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

      // Stream via hook and feed the typewriter buffer
      await streamChat({
        threadId: useThreadId,
        messages: [{ role: "user", content: text }],
        model: selectedModel,
        mode: currentModeRef.current,
        mcpSettings: getMcpSettings(),
        onDelta: (delta) => {
          if (!delta) return;
          const tw = typewriterRef.current;
          tw.buffer += delta;
          tw.final += delta;
          if (tw.timer === 0) {
            tw.timer = window.setInterval(tick, TICK_MS);
          }
        },
        onDone: () => {
          const tw = typewriterRef.current;
          tw.done = true;
        },
        onError: () => {
          show("Chat request failed", "error");
          setOptimisticUser(null);
        },
      });
    },
    [
      chatId,
      threads,
      refresh,
      refreshThreads,
      show,
      globalSpec,
      sendUserMessage,
      streamChat,
      router,
    ],
  );

  // Cleanup on unmount: cancel any pending rAF to avoid leaks
  useEffect(() => {
    return () => {
      if (typewriterRef.current.timer)
        window.clearInterval(typewriterRef.current.timer);
    };
  }, []);

  // Handle initial message from URL params (when coming from home page)
  // Guard against double-invocation in React Strict Mode
  const initRef = useRef<{ id: string; sent: boolean }>({
    id: chatId,
    sent: false,
  });
  useEffect(() => {
    if (initRef.current.id !== chatId)
      initRef.current = { id: chatId, sent: false };
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
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    const lastAssistantMessage = messages
      .filter((m) => m.role === "assistant")
      .pop();

    if (!lastUserMessage) return;

    // Delete the last assistant message if it exists
    if (lastAssistantMessage) {
      try {
        await deleteMessage(lastAssistantMessage.id);
        await refresh();
      } catch {
        show("Failed to delete previous response", "error");
        return;
      }
    }

    // Re-send the last user message to generate a new response
    await onSend(lastUserMessage.content);
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    currentModeRef.current = newMode;
  };

  return (
    <div className="h-full min-h-0">
      <Chat
        messages={merged}
        onSend={onSend}
        onRegenerate={handleRegenerate}
        isStreaming={!!pending}
        mode={mode}
        onChangeMode={handleModeChange}
        onTogglePin={(id, next) => togglePin(id, next)}
        onUpdateTickets={(id, tickets) => updateTickets(id, tickets)}
      />
    </div>
  );
}
