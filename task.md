You are a senior design + frontend engineer. I have a Next.js 15 + React 19 project set up with Tailwind CSS v4, Vercel AI SDK, Drizzle ORM, Postgres (Docker), and Zod for all runtime validation/typing. Build a beautiful, minimal light/dark UI chat app with a collapsible conversation history side panel, per-thread chat context, automatic summarization for long threads, future-ready MCP client scaffolding, and **first-class Markdown rendering with syntax-highlighted code blocks**.

CONSTRAINTS
- TypeScript only; never use `any`.
- No `interface` types—use Zod schemas and `z.infer` only.
- Components should be small and maintainable (~≤200 LOC where practical).
- Follow React best practices (stable keys, accessibility, client/server split).
- Always install latest package versions.
- Use Vercel AI SDK for streaming, defaulting to Google **Gemini 2.0 Flash** (`gemini-2.0-flash`).
- Multi-LLM via Zod-validated config; default provider is Google but extensible later.
- Local Postgres via Docker + Drizzle ORM for persistence.

FEATURES
1) THEME & SHELL
   - Deliver `theme.tokens.json` (semantic tokens), `theme.css` (Tailwind layer mapping tokens → CSS vars for :root[data-theme="light"|"dark"]), and `ThemeProvider.tsx`.
   - ThemeProvider detects system theme, persists user choice in localStorage, and exposes a toggle with `aria-label="Toggle theme"`.
   - App shell with header, content, and a **collapsible left side panel** for conversation history (toggle via button and `Cmd/Ctrl+B`), keyboard accessible with SR announcements.

2) CONVERSATION HISTORY SIDE PANEL
   - Searchable, paginated thread list: title, last message preview, relative timestamp, unread indicator.
   - Actions: create, rename, archive, delete (confirm), pin; list is virtualized and supports compact/comfortable density.
   - When collapsed, show an icon rail with tooltips.
   - **Peek summary shortcut**: quick view of each thread’s stored summary (tooltip or inline expand).

3) PER-THREAD CHAT CONTEXT
   - Each thread has isolated context; switching threads must not leak messages.
   - Hooks:
     - `useThreads()` – list/search/create/rename/archive/delete (SWR).
     - `useMessages(threadId)` – paginated fetch + optimistic append; reconciles after stream.
     - `useChatContext(threadId)` – assembles prompt context (summary + pins + recent tail) enforcing token budgets.

4) AUTOMATIC SUMMARIZATION (LONG THREADS)
   - Rolling summary per thread in DB; trigger on token overage, message threshold, or manual action.
   - Summary format: brief narrative + bullets + important facts/entities + TODOs + citations (message ids).
   - UI: “Summarized • View summary” chip; manual Re-summarize.
   - **Pinning rule**: pinned messages are always included in context and **never** summarized away.

5) DATA MODEL (DRIZZLE + POSTGRES)
   - Tables (with Zod schemas; export types via `z.infer`):
     - `users`: id, email, displayName, createdAt, isActive
     - `threads`: id, title, ownerId(FK), createdAt, archived, pinned, summaryText, summaryModel, summaryUpdatedAt, turnCount, tokenEstimate
     - `messages`: id, threadId(FK), role("user"|"assistant"|"system"), content, model, createdAt, pinned
   - Indices for `threads(ownerId, createdAt DESC)` and `messages(threadId, createdAt ASC)`; initial migrations + seed.

6) STREAMING CHAT
   - `/api/chat` accepts `{ threadId, messages[], model? }`.
   - Context built via `useChatContext` (summary + pins + recent tail within budget).
   - Stream assistant tokens to the client; persist final assistant message on finish. Persist user message immediately (support optional `client_msg_id` for idempotency).

7) API ROUTES
   - `/api/threads` – GET (list/search, pagination, archived filter), POST (create), PATCH (rename/archive/pin), DELETE.
   - `/api/messages` – GET by thread (pagination).
   - `/api/chat` – streaming as above.
   - `/api/summarize` – POST `{ threadId }` to re-summarize.

8) MCP (FUTURE-READY)
   - Scaffolding only:
     - `mcp/config.ts` (Zod config for servers), `mcp/adapter.ts` (lazy connect, heartbeat, discovery, `invokeTool` with Zod I/O).
     - Hooks: `useMcpServers`, `useMcpConnection`, `useMcpTool`.
     - UI: settings modal + tool runner panel (feature-flagged).

9) **MESSAGE RENDERING — BEAUTIFUL MARKDOWN & CODE**
   - Render assistant/user messages as **CommonMark + GFM** (headings, lists, tables, task lists, links, images).
   - **Security**: do NOT use `dangerouslySetInnerHTML`. Use a Markdown pipeline with HTML disabled by default; if raw HTML must be allowed, sanitize with a strict allow-list (e.g., `sanitize-html`) before render.
   - **Code blocks**:
     - Syntax highlighting with **Shiki** (latest) or `rehype-pretty-code`; support language detection fallback.
     - Show language badge and optional filename (from fenced info string, e.g., ```ts:app.tsx).
     - Line numbers (optional toggle), **copy-to-clipboard** button, and a **collapse/expand** affordance for very long blocks (collapsed by default over N lines).
     - Preserve whitespace; wrap long lines gracefully with a horizontal scroll area.
   - **Inline code** styled distinctly with accessible contrast.
   - **Links** open in new tab with `rel="noopener noreferrer"`; auto-link plain URLs.
   - **Tables**: responsive (wrap or horizontal scroll), with subtle row separators.
   - **Images**: constrained max-width, click-to-zoom/lightbox optional; show alt text.
   - **Extras (optional if simple)**: support Mermaid diagrams and math (KaTeX) via opt-in toggles; keep bundle size reasonable.
   - **Streaming-friendly rendering**: progressively render partial Markdown as tokens stream in; maintain correct block boundaries to avoid broken code fences and re-highlight as needed with minimal flicker.
   - **Copy message** action (entire message), and per-block copy for code.
   - **Message toolbar**: pin/unpin, delete (confirm), and “quote reply” inserts a quoted block into composer.

10) UI COMPONENTS
   - `Chat.tsx`: virtualized list, role styling, streaming, jump-to-latest, composer (Enter send / Shift+Enter newline), error banners, loading state.
   - `Sidebar.tsx`: collapsible, searchable, with peek summary and thread actions.
   - `ThreadHeader.tsx`: title, model selector, summarize chip, archive/pin/rename menu.
   - `MarkdownMessage.tsx`: implements the Markdown + code rendering rules above.
   - `Button.tsx`, `Input.tsx`, `Card.tsx`: themed with tokens.
   - All themed, responsive, and accessible.

11) HOOKS
   - `useThreads`, `useMessages`, `useChatContext` as described (SWR).
   - Add `useMarkdownRenderer()` if needed to encapsulate Shiki/rehype configuration with memoization.

DELIVERABLES
- `theme.tokens.json`, `theme.css`, `ThemeProvider.tsx`
- `components/Sidebar.tsx`, `components/Chat.tsx`, `components/ThreadHeader.tsx`, `components/MarkdownMessage.tsx`, `components/Button.tsx`, `components/Input.tsx`, `components/Card.tsx`
- `hooks/useThreads.ts`, `hooks/useMessages.ts`, `hooks/useChatContext.ts`, (optional) `hooks/useMarkdownRenderer.ts`
- `app/api/threads/route.ts`, `app/api/messages/route.ts`, `app/api/chat/route.ts`, `app/api/summarize/route.ts`
- Drizzle schemas & migrations
- README with env vars, summarization rules (pinning), token budgets, Markdown/Code rendering notes

STYLE
- Modern SaaS dashboard aesthetic; calm neutrals, high-contrast text, subtle elevation, crisp focus rings.
- Responsive down to mobile with a slide-over sidebar.
- Accessibility: keyboard navigable, ARIA labels, focus traps where appropriate, screen-reader announcements for panel toggle and stream start/finish.

Please output complete TypeScript + Zod code files, ready to paste into a Next.js 15 App Router project.
