"use client";
import { useEffect, useRef, useState } from "react";
import { Copy, RotateCcw, Send, ChevronsDown } from "lucide-react";
import MarkdownMessage from "./MarkdownMessage";
import ModelPicker from "./ModelPicker";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  pinned?: boolean;
};

export type ChatProps = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onRegenerate?: () => void;
  isStreaming?: boolean;
  onLoadMoreTop?: () => void | Promise<unknown>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onTogglePin?: (id: string, nextPinned: boolean) => void | Promise<unknown>;
};

export function Chat({
  messages,
  onSend,
  onRegenerate,
  isStreaming,
}: ChatProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [nearBottom, setNearBottom] = useState(true);
  const [hasBelow, setHasBelow] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const scrollToBottomNow = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const scrollToBottomSmooth = () => {
    const el = scrollRef.current;
    if (!el) return;
    try {
      (el as any).scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } catch {
      const start = el.scrollTop;
      const target = el.scrollHeight;
      const duration = 350;
      let startTime: number | null = null;
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const step = (ts: number) => {
        if (startTime === null) startTime = ts;
        const t = Math.min(1, (ts - startTime) / duration);
        el.scrollTop = start + (target - start) * easeOutCubic(t);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  };

  const sendAndScroll = (text: string) => {
    onSend(text);
    // Nudge scroll after layout with rAF to ensure we're at bottom
    requestAnimationFrame(scrollToBottomNow);
  };

  // When streaming begins, ensure the typing indicator/new assistant bubble is visible.
  // Only do this if the user is already near the bottom (don't yank if they've scrolled up).
  useEffect(() => {
    if (!isStreaming) return;
    if (!nearBottom) return;
    requestAnimationFrame(scrollToBottomNow);
  }, [isStreaming, nearBottom]);

  // Track whether user is near the bottom of the scroll container
  // Use hysteresis + rAF + passive listener to avoid re-render thrash
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let ticking = false;
    const IN = 160; // become near when within 160px
    const OUT = 260; // become not-near when farther than 260px
    const update = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setHasBelow(distance > 4);
      setNearBottom((prev) => {
        const next = prev ? distance <= OUT : distance <= IN;
        return next === prev ? prev : next;
      });
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };
    update();
    el.addEventListener("scroll", onScroll, {
      passive: true,
    } as AddEventListenerOptions);
    return () => el.removeEventListener("scroll", onScroll as EventListener);
  }, []);

  // Also recompute when container resizes (e.g., code block expands)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setHasBelow(distance > 1);
    };
    update();
    const onResize = () => requestAnimationFrame(update);
    window.addEventListener("resize", onResize, {
      passive: true,
    } as AddEventListenerOptions);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => onResize());
      ro.observe(el);
    }
    return () => {
      window.removeEventListener("resize", onResize as any);
      if (ro) ro.disconnect();
    };
  }, []);

  // Recompute proximity when content changes, without forcing toggles
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const IN = 160;
    const OUT = 260;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setHasBelow(distance > 4);
    setNearBottom((prev) => {
      const next = prev ? distance <= OUT : distance <= IN;
      return next === prev ? prev : next;
    });
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value?.trim();
    if (!value) return;
    sendAndScroll(value);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopiedId(null), 1200);
  };

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[color:var(--color-bg)]">
      {/* Main Content Area */}
      <div
        ref={scrollRef}
        className="flex-1 relative overflow-y-auto px-6 py-8 max-w-4xl mx-auto w-full"
        style={{ overscrollBehaviorY: "contain", scrollbarGutter: "stable" }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-8">
              <h2 className="text-3xl font-semibold text-[color:var(--color-text)] mb-4">
                How can I help you today?
              </h2>
              <p className="text-lg text-[color:var(--color-muted)]">
                I can help transform your ideas into GitHub issues
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {[
                "Create a bug report",
                "Draft a feature request",
                "Generate issue template",
                "Structure documentation",
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => sendAndScroll(example)}
                  className="p-4 text-left bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-lg hover:bg-[color:var(--color-card)] transition-colors cursor-pointer"
                >
                  <span className="text-sm text-[color:var(--color-text)]">
                    {example}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className="group">
                <div
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  } mb-2`}
                >
                  <div
                    className={`max-w-3xl px-4 py-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-[color:var(--color-surface)] text-[color:var(--color-text)] border border-[color:var(--color-border)]"
                        : "bg-transparent text-[color:var(--color-text)]"
                    }`}
                  >
                    <MarkdownMessage content={message.content} />
                  </div>
                </div>

                {/* Action buttons */}
                <div
                  className={`flex ${
                    message.role === "user"
                      ? "justify-end pr-4"
                      : "justify-start"
                  } opacity-0 group-hover:opacity-100 transition-opacity`}
                >
                  <div className="flex items-center gap-1">
                    <span className="relative inline-block">
                      <button
                        onClick={() => handleCopy(message.id, message.content)}
                        className="peer p-1 rounded hover:bg-[color:var(--color-card)] text-[color:var(--color-muted)] hover:text-[color:var(--color-text)] cursor-pointer"
                        aria-label={copiedId === message.id ? "Copied" : "Copy"}
                      >
                        <Copy size={16} />
                      </button>
                      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 text-xs rounded bg-[color:var(--color-surface)] text-[color:var(--color-text)] border border-[color:var(--color-border)] shadow opacity-0 peer-hover:opacity-100">
                        {copiedId === message.id ? "Copied" : "Copy"}
                      </span>
                    </span>
                    {message.role === "assistant" && (
                      <>
                        <span className="relative inline-block">
                          <button
                            onClick={onRegenerate}
                            className="peer p-1 rounded hover:bg-[color:var(--color-card)] text-[color:var(--color-muted)] hover:text-[color:var(--color-text)] cursor-pointer"
                            aria-label="Regenerate response"
                          >
                            <RotateCcw size={16} />
                          </button>
                          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 text-xs rounded bg-[color:var(--color-surface)] text-[color:var(--color-text)] border border-[color:var(--color-border)] shadow opacity-0 peer-hover:opacity-100">
                            Regenerate
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isStreaming && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-1 px-4 py-3">
                  <div className="w-2 h-2 bg-[color:var(--color-muted)] rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-[color:var(--color-muted)] rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-[color:var(--color-muted)] rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Bottom sentinel retained (unused but harmless) */}
        <div ref={bottomRef} style={{ height: 1 }} aria-hidden />
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 max-w-4xl mx-auto w-full">
        {/* Model picker and Jump-to-latest on the same row */}
        <div className="mb-2 flex items-center">
          <ModelPicker />
          <button
            onClick={scrollToBottomSmooth}
            className={`mx-auto p-2 ml-50 rounded-full bg-[color:var(--color-surface)] border border-[color:var(--color-border)] shadow hover:bg-[color:var(--color-card)] text-[color:var(--color-text)] cursor-pointer transition-opacity ${
              hasBelow ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            aria-label="Jump to latest"
            aria-hidden={!hasBelow}
          >
            <ChevronsDown size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            rows={2}
            placeholder="Ask anything..."
            className="w-full min-h-[64px] max-h-32 px-4 py-4 pr-14 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-lg text-[color:var(--color-text)] placeholder-[color:var(--color-muted)] resize-none focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary)] focus:border-[color:var(--color-primary)]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-[color:var(--color-muted)] hover:text-[color:var(--color-text)] transition-colors cursor-pointer"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
