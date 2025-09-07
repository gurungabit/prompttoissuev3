# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: App Router pages and API routes (`src/app/api/*`).
- `src/components`, `src/hooks`, `src/lib`: UI, hooks, utilities (chat context, summarization, schemas).
- `src/db`: Drizzle client and schema; generated SQL in `drizzle/`.
- `public/`: static assets. Config lives at repo root (`biome.json`, `drizzle.config.ts`).
- `mcp/`: optional Model Context Protocol config/adapter.

## Build, Test, and Development Commands
- `npm run dev`: dev server (Turbopack) at http://localhost:3000.
- `npm run build` / `npm start`: production build and run.
- `npm run lint` / `npm run format`: Biome check and write.
- `npm run db:generate` / `npm run db:push`: Drizzle generate and apply.
- Postgres (Docker): `docker compose up -d db`.

## Coding Style & Naming Conventions
- TypeScript only; never use `any`. Prefer `unknown` and narrow with Zod.
- No `interface` types—define Zod schemas and derive types via `z.infer`.
- 2-space indent, semicolons, double quotes; run Biome before pushing.
- Naming: PascalCase components, `useX` hooks, camelCase TS, snake_case DB.
- API routes in `src/app/api/.../route.ts`.
- Prefer explicit schemas over `z.any()`; use `z.unknown()` or structured shapes when possible.

### Zod Usage (Important)
- Entire codebase uses Zod v3 consistently across all modules.
- MCP code (anything under `src/mcp/**` using `@modelcontextprotocol/sdk`): pass raw shapes to MCP APIs. Concretely, define tool inputs as plain shapes: `inputSchema: { a: z.number(), b: z.number() }` — do not pass `z.object({...})` to `tool`/`registerTool`.
- App code (everywhere else): use `z.object({...})` for validation and `z.infer<typeof Schema>` for types as normal.
- Rationale: MCP's TypeScript SDK expects raw shapes for params; consistent Zod v3 usage across codebase avoids version conflicts.

## React & Component Practices
- Keep component files ~200–300 LOC; extract subcomponents/hooks when larger.
- Follow React best practices: stable keys, ARIA labels, focus states, memoization prudently.
- Correct client/server split for Next.js; avoid blocking server work in client.
- Do not use `dangerouslySetInnerHTML`; reuse the Markdown pipeline already present.

## Theming & Styles
- Use `src/theme.tokens.json` and `src/theme.css` (CSS vars under `:root[data-theme]`).
- Tailwind v4 utilities only; avoid ad‑hoc inline styles and hardcoded colors.
- Derive colors/spacing from tokens; support light/dark via `data-theme`.

## Testing Guidelines
- No test runner is configured yet. Preferred: Vitest + React Testing Library.
- Place tests beside code or under `src/**/__tests__/**` with `*.test.ts(x)`.
- Aim to cover chat context building, API route handlers, and DB actions.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (e.g., `feat:`, `fix:`, `chore:`). Example: `feat: improve code highlighting in MarkdownMessage`.
- PRs must include: clear summary (what/why), linked issues, UI screenshots/GIFs when relevant, migration notes (`drizzle` changes), and local test/validation steps.
- Run `npm run lint` and `npm run format` before opening a PR.

## Change Strategy
- Before bold changes, review existing code for conventions and match them.
- Prefer incremental refactors with minimal churn; align with current folder and naming patterns.
- Keep runtime validation at boundaries (API, env) with Zod.

## Security & Configuration Tips
- Copy `.env.example` → `.env.local`; never commit secrets. DB via `DATABASE_URL` or `POSTGRES_*` (local: `POSTGRES_SSL=false`). AI keys optional. Health: `GET /api/health`. MCP is opt‑in.
