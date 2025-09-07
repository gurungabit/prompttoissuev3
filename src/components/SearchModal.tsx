"use client";
import { Edit, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  threads: Array<{
    id: string;
    title: string;
    preview: string;
    updatedAt: string;
  }>;
  onSelectThread: (id: string) => void;
  onNewChat: () => void;
};

export function SearchModal({
  isOpen,
  onClose,
  threads,
  onSelectThread,
  onNewChat,
}: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  const filteredThreads = threads.filter(
    (thread) =>
      thread.title.toLowerCase().includes(query.toLowerCase()) ||
      thread.preview.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (threadId: string) => {
    onSelectThread(threadId);
    router.push(`/chat/${threadId}`);
    onClose();
    setQuery("");
  };

  const handleNewChat = () => {
    onNewChat();
    router.push("/");
    onClose();
    setQuery("");
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer"
        onClick={onClose}
      >
        <div
          className="bg-[color:var(--color-surface)] rounded-lg shadow-lg w-full max-w-2xl max-h-[70vh] flex flex-col cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-[color:var(--color-border)]">
            <Search size={20} className="text-[color:var(--color-muted)]" />
            <input
              type="text"
              placeholder="Search or press Enter to start new chat..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-[color:var(--color-text)] placeholder-[color:var(--color-muted)] focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !query.trim()) {
                  handleNewChat();
                }
                if (e.key === "Escape") {
                  onClose();
                }
              }}
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-[color:var(--color-card)] rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} className="text-[color:var(--color-muted)]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* New Chat Option */}
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-3 p-3 hover:bg-[color:var(--color-card)] transition-colors text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[color:var(--color-primary)] flex items-center justify-center">
                <Edit
                  size={16}
                  className="text-[color:var(--color-primary-contrast)]"
                />
              </div>
              <div>
                <div className="font-medium text-[color:var(--color-text)]">
                  New chat
                </div>
                <div className="text-sm text-[color:var(--color-muted)]">
                  Start a fresh conversation
                </div>
              </div>
            </button>

            {/* Recent Chats */}
            {filteredThreads.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-[color:var(--color-primary)] uppercase tracking-wider">
                  Recent Chats
                </div>
                {filteredThreads.slice(0, 10).map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => handleSelect(thread.id)}
                    className="w-full flex items-start gap-3 p-3 hover:bg-[color:var(--color-card)] transition-colors text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[color:var(--color-surface)] border border-[color:var(--color-border)] flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-[color:var(--color-muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[color:var(--color-text)] truncate">
                        {thread.title}
                      </div>
                      <div className="text-sm text-[color:var(--color-muted)] truncate">
                        {thread.preview || "No messages yet"}
                      </div>
                    </div>
                    <div className="text-xs text-[color:var(--color-muted)] flex-shrink-0">
                      {formatTime(thread.updatedAt)}
                    </div>
                  </button>
                ))}
              </>
            )}

            {query && filteredThreads.length === 0 && (
              <div className="p-8 text-center text-[color:var(--color-muted)]">
                No conversations found for "{query}"
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
