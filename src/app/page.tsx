"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Chat, type ChatMessage } from "../components/Chat";
import type { Mode } from "../components/ModeToggle";
import { useToast } from "../components/Toast";
import { useThreadSelection } from "../context/ThreadSelection";
import { useThreads } from "../hooks/useThreads";

export default function Home() {
  const router = useRouter();
  const { threads, create } = useThreads();
  const { selectedId } = useThreadSelection();
  const { show } = useToast();
  const [mode, setMode] = useState<Mode>("assistant");

  // Load saved mode after hydration so New Chat reflects user preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("chat-mode");
      if (saved === "assistant" || saved === "ticket") {
        setMode(saved as Mode);
      }
    }
  }, []);

  // Redirect to existing thread if one is selected and exists
  useEffect(() => {
    if (selectedId && threads.some((t) => t.id === selectedId)) {
      router.push(`/chat/${selectedId}`);
    }
  }, [selectedId, threads, router]);

  // This is just for new chat creation - no messages, no streaming
  const messages: ChatMessage[] = [];

  async function onSend(text: string) {
    try {
      // Create new thread with user's message as the title (first 50 chars)
      const title = text.slice(0, 50) + (text.length > 50 ? "..." : "");
      const t = await create(title);

      // Immediately redirect to the chat page with the message as a URL param
      // The chat page will handle sending the message and streaming
      const params = new URLSearchParams({ message: text });
      router.push(`/chat/${t.id}?${params.toString()}`);
    } catch (error) {
      show("Failed to create chat", "error");
      console.error("Create chat error:", error);
    }
  }

  const handleRegenerate = async () => {
    // No regenerate on empty chat
  };

  return (
    <div className="h-full min-h-0">
      <Chat
        messages={messages}
        onSend={onSend}
        onRegenerate={handleRegenerate}
        isStreaming={false}
        mode={mode}
        onChangeMode={setMode}
        onTogglePin={async () => {}}
      />
    </div>
  );
}
