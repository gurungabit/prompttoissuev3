"use client";
import {
  Edit,
  MoreHorizontal,
  PanelLeft,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmModal } from "./ConfirmModal";
import { SearchModal } from "./SearchModal";

export type SidebarThread = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  pinned: boolean;
};

export type SidebarProps = {
  threads: SidebarThread[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onLoadMore?: () => Promise<unknown>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onRenameThread?: (id: string, newTitle: string) => void;
  onPinThread?: (id: string, pinned: boolean) => void;
  onDeleteThread?: (id: string) => void;
};

export function Sidebar({
  threads,
  selectedId,
  onSelect,
  onCreate,
  collapsed,
  onToggleCollapse,
  onLoadMore,
  hasMore,
  isLoadingMore,
  onRenameThread,
  onPinThread,
  onDeleteThread,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredThreads = threads.filter(
    (thread) =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.preview.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Infinite scroll functionality
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement || !onLoadMore || !hasMore) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold

      if (scrolledToBottom && !isLoadingMore) {
        onLoadMore();
      }
    };

    scrollElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [onLoadMore, hasMore, isLoadingMore]);

  if (collapsed) {
    return (
      <>
        <div className="flex flex-col h-full py-2">
          {/* Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="p-2 mx-2 mb-2 hover:bg-[color:var(--color-card)] hover:scale-110 rounded-lg transition-all duration-200 cursor-pointer group"
            title="Expand sidebar"
          >
            <PanelLeft
              size={20}
              className="text-[color:var(--color-muted)] group-hover:text-[color:var(--color-text)] rotate-180 transition-colors"
            />
          </button>

          {/* New Chat */}
          <button
            onClick={onCreate}
            className="p-2 mx-2 mb-2 hover:bg-[color:var(--color-card)] hover:scale-110 rounded-lg transition-all duration-200 cursor-pointer group"
            title="New conversation"
          >
            <Plus
              size={20}
              className="text-[color:var(--color-muted)] group-hover:text-[color:var(--color-text)] transition-colors"
            />
          </button>

          {/* Search */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="p-2 mx-2 hover:bg-[color:var(--color-card)] hover:scale-110 rounded-lg transition-all duration-200 cursor-pointer group"
            title="Search conversations"
          >
            <Search
              size={20}
              className="text-[color:var(--color-muted)] group-hover:text-[color:var(--color-text)] transition-colors"
            />
          </button>
        </div>

        <SearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          threads={threads}
          onSelectThread={onSelect}
          onNewChat={onCreate}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-[color:var(--color-border)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[color:var(--color-text)]">
              Conversations
            </h2>
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-[color:var(--color-card)] rounded-lg transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <PanelLeft size={16} className="text-[color:var(--color-text)]" />
            </button>
          </div>

          {/* New Conversation Button */}
          <button
            onClick={onCreate}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[color:var(--color-card)] text-[color:var(--color-text)] rounded-lg transition-colors text-sm font-medium cursor-pointer"
          >
            <Plus size={16} />
            New chat
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-lg text-[color:var(--color-text)] placeholder-[color:var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] focus:border-transparent"
          />
        </div>

        {/* Threads List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-20">
          <div className="space-y-2">
            {filteredThreads.length === 0 ? (
              <div className="text-center py-8 text-[color:var(--color-muted)] text-sm">
                {searchQuery
                  ? "No matching conversations"
                  : "No conversations yet"}
              </div>
            ) : (
              filteredThreads.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  isSelected={selectedId === thread.id}
                  onSelect={() => onSelect(thread.id)}
                  onRename={
                    onRenameThread
                      ? (newTitle) => onRenameThread(thread.id, newTitle)
                      : undefined
                  }
                  onPin={
                    onPinThread
                      ? () => onPinThread(thread.id, !thread.pinned)
                      : undefined
                  }
                  onDelete={
                    onDeleteThread ? () => onDeleteThread(thread.id) : undefined
                  }
                />
              ))
            )}

            {/* Loading indicator */}
            {isLoadingMore && (
              <div className="text-center py-4 text-[color:var(--color-muted)] text-sm">
                Loading more conversations...
              </div>
            )}

            {/* No more indicator */}
            {!hasMore && threads.length > 0 && !isLoadingMore && (
              <div className="text-center py-4 text-[color:var(--color-muted)] text-xs">
                All conversations loaded
              </div>
            )}
          </div>
        </div>
      </div>

      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        threads={threads}
        onSelectThread={onSelect}
        onNewChat={onCreate}
      />
    </>
  );
}

function ThreadItem({
  thread,
  isSelected,
  onSelect,
  onRename,
  onPin,
  onDelete,
}: {
  thread: SidebarThread;
  isSelected: boolean;
  onSelect: () => void;
  onRename?: (newTitle: string) => void;
  onPin?: () => void;
  onDelete?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(thread.title);
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleRename = () => {
    setShowMenu(false);
    setIsRenaming(true);
    setRenameValue(thread.title);
  };

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue.trim() !== thread.title) {
      onRename?.(renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setRenameValue(thread.title);
  };

  const handlePin = () => {
    onPin?.();
    setShowMenu(false);
  };

  const handleDeleteClick = () => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    onDelete?.();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="relative group">
      <button
        onClick={isRenaming ? undefined : onSelect}
        className={`w-full p-3 text-left transition-colors ${!isRenaming ? "cursor-pointer" : "cursor-default"} ${
          isSelected
            ? "bg-[color:var(--color-card)] border-l-2 border-[color:var(--color-primary)] rounded-r-lg text-[color:var(--color-text)]"
            : "hover:bg-[color:var(--color-card)] text-[color:var(--color-text)] rounded-lg"
        }`}
      >
        <div className="flex items-start justify-between mb-1">
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRenameSubmit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  handleRenameCancel();
                }
                e.stopPropagation();
              }}
              onBlur={handleRenameSubmit}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-sm flex-1 pr-2 bg-[color:var(--color-surface)] border border-[color:var(--color-primary)] rounded px-2 py-1 text-[color:var(--color-text)] focus:outline-none"
            />
          ) : (
            <h3 className="font-medium text-sm truncate flex-1 pr-2">
              {thread.title}
            </h3>
          )}
          <div className="flex items-center gap-1">
            {thread.pinned && (
              <div
                className={`w-2 h-2 rounded-full ${isSelected ? "bg-[color:var(--color-primary)]" : "bg-[color:var(--color-primary)]"}`}
              ></div>
            )}
          </div>
        </div>
        <p className={`text-xs truncate text-[color:var(--color-muted)]`}>
          {thread.preview || "No messages yet"}
        </p>
        <div className={`text-xs mt-1 text-[color:var(--color-muted)]`}>
          {formatTime(thread.updatedAt)}
        </div>
      </button>

      {/* Menu Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className={`absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
          showMenu ? "opacity-100" : ""
        } hover:bg-[color:var(--color-surface)] text-[color:var(--color-text)]`}
      >
        <MoreHorizontal size={14} />
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute top-8 right-0 z-30 w-48 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-lg shadow-lg py-1">
            {onRename && (
              <button
                onClick={handleRename}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-card)] transition-colors cursor-pointer"
              >
                <Edit size={14} />
                Rename
              </button>
            )}
            {onPin && (
              <button
                onClick={handlePin}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-card)] transition-colors cursor-pointer"
              >
                <Pin size={14} />
                {thread.pinned ? "Unpin" : "Pin"}
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDeleteClick}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete conversation"
        message={`Are you sure you want to delete "${thread.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        dangerous={true}
      />
    </div>
  );
}
