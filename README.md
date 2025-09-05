This is a Next.js 15 + React 19 app scaffold for a minimal, themed chat UI with a collapsible conversation sidebar, hooks, API stubs, and Drizzle schemas.

## Getting Started

First, install dependencies and run the dev server:

```bash
npm install
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Key files to explore:

- `src/theme.tokens.json` and `src/theme.css` – tokens and theme variables
- `src/ThemeProvider.tsx` – system theme detection, toggle, persistence
- `src/components/*` – UI primitives and chat shell
- `src/hooks/*` – threads/messages fetching and context builder
- `src/app/api/*` – API route stubs (in-memory)
- `src/db/schema.ts` and `drizzle/0000_init.sql` – Drizzle + SQL schema

The page auto-updates as you edit files.

Environment variables (local Postgres):

```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=app
POSTGRES_SSL=false
AI_PROVIDER=google
GOOGLE_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key
```

Migrations (Drizzle Kit):

```
npx drizzle-kit generate
npx drizzle-kit push
```

Summarization rules and token budgets:

- Pinned messages are always included; never summarized away.
- Context builder includes: system + pinned + summary + recent tail within budget.
- Default model: `gemini-2.0-flash`. Adjust budget in `useChatContext.ts` `tokenBudget`.
- Token estimate is naive (~4 chars/token) and can be replaced with a tokenizer.

Docker (Postgres)

1. Copy `.env.example` to `.env.local` and adjust if needed.

```
cp .env.example .env.local
```

2. Start Postgres:

```
docker compose up -d db
```

3. Push the schema to the database (creates tables/columns):

```
npm run db:push
```

4. Run the app:

```
npm run dev
```

Health check
- `GET /api/health` returns `{ ok: true }` when DB is reachable.

Notes
- The app connects using either `DATABASE_URL` or the `POSTGRES_*` variables.
- On first load, it will create an initial thread automatically.
- If you see `The server does not support SSL connections` when running Drizzle, set `POSTGRES_SSL=false` (default in `.env.example`) or `PGSSLMODE=disable` in your shell.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
