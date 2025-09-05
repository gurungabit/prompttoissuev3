"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ThemeToggleButton } from "../ThemeProvider";
import { Sidebar } from "./Sidebar";
import { useThreads } from "../hooks/useThreads";
import { useThreadSelection } from "../context/ThreadSelection";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { threads, create, rename, pin, remove, refresh } = useThreads();
  const { selectedId, setSelectedId } = useThreadSelection();

  // Extract thread ID from URL if we're on a chat page
  useEffect(() => {
    const chatMatch = pathname.match(/^\/chat\/([^\/]+)$/);
    if (chatMatch) {
      setSelectedId(chatMatch[1]);
    } else if (pathname === '/') {
      setSelectedId(null);
    }
  }, [pathname, setSelectedId]);

  const currentThread = threads.find((t) => t.id === selectedId);

  return (
    <div className="flex h-screen bg-[color:var(--color-bg)]">
      {/* Sidebar */}
      <div
        className={`${
          sidebarCollapsed ? "w-12" : "w-80"
        } transition-all duration-300 border-r border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden`}
      >
        <Sidebar
          threads={threads.map((t) => ({
            id: t.id,
            title: t.title,
            preview: t.lastMessagePreview ?? "",
            updatedAt: t.summaryUpdatedAt ?? t.createdAt,
            pinned: t.pinned ?? false,
          }))}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            router.push(`/chat/${id}`);
          }}
          onCreate={() => {
            setSelectedId(null);
            router.push('/');
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onRenameThread={async (id, newTitle) => {
            await rename(id, newTitle);
            await refresh();
          }}
          onPinThread={async (id, pinned) => {
            await pin(id, pinned);
            await refresh();
          }}
          onDeleteThread={async (id) => {
            await remove(id);
            await refresh();
            // If we deleted the selected thread, select another one
            if (selectedId === id) {
              const remaining = threads.filter((t) => t.id !== id);
              setSelectedId(remaining[0]?.id ?? null);
            }
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <h1 className="text-lg font-semibold text-[color:var(--color-text)]">
            {currentThread?.title || "Prompt To Issue"}
          </h1>
          <ThemeToggleButton />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
