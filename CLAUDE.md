# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 + React 19 chat application with AI integration, featuring dual modes (assistant and ticket generation), Model Context Protocol (MCP) integration for GitLab repository analysis, and comprehensive ticket management functionality.

## Development Commands

```bash
# Development
npm run dev                 # Start dev server with Turbopack at http://localhost:3000
npm run build              # Production build with Turbopack
npm start                  # Run production server

# Code Quality
npm run lint               # Run Biome linter (check only)
npm run lint:fix           # Run Biome with auto-fixes (safe)
npm run lint:fix:unsafe    # Run Biome with unsafe fixes
npm run format             # Format code with Biome

# Database (Drizzle)
npm run db:generate        # Generate migration files
npm run db:push            # Apply schema changes to database
docker compose up -d db    # Start PostgreSQL container

# MCP GitLab Server
npm run mcp:gitlab         # Run GitLab MCP server directly (debugging)
```

## Architecture

### Core Architecture Pattern
- **Dual Mode System**: The app operates in two distinct modes via `/api/chat`:
  - `assistant`: Traditional streaming chat with optional MCP tool integration
  - `ticket`: Research-driven ticket generation using forced tool calls
- **MCP Integration**: Model Context Protocol adapter (`src/mcp/`) enables AI to research GitLab repositories
- **Context Building**: Smart context management with token budgeting, summarization, and pinned message preservation

### Key Components

**API Layer (`src/app/api/`)**
- `chat/route.ts`: Main chat endpoint handling both assistant and ticket modes
- `threads/`, `messages/`: Thread and message CRUD operations
- `summarize/route.ts`: Thread summarization when token limits exceeded

**LLM Integration (`src/lib/llm.ts`)**
- Provider abstraction (Google Gemini, OpenAI)
- GitLab URL detection and project info parsing
- MCP tool integration with automatic prefetching
- Tool enforcement logic for ticket mode (`enforceFirstToolCall`)

**MCP System (`src/mcp/`)**
- `adapter.ts`: MCP client management with STDIO transport
- `gitlab/index.ts`: Full GitLab API integration with 11 tools (search, file reading, repo overview)
- `config.ts`: Environment-based MCP configuration

**Ticket System (`src/lib/tickets.ts`, `src/components/tickets/`)**
- Zod-validated ticket schemas with acceptance criteria and tasks
- Interactive ticket editing with drag-drop reordering
- Integration with chat system for AI-generated tickets

**Context Management (`src/lib/chat-context.ts`)**
- Token-budget-aware context building
- Pinned message preservation during summarization
- Smart inclusion of summary + recent messages

## Critical Implementation Details

### Zod Usage
- **Entire codebase uses Zod v3** - consistent across MCP and app code
- **MCP APIs**: Pass raw shapes to MCP APIs (not `z.object()`)
  ```typescript
  inputSchema: { projectId: z.string() }  // Raw shape for MCP
  ```
- **App schemas**: Use `z.object()` for validation and `z.infer<>` for types normally

### Tool Enforcement Logic
When GitLab URLs are detected in ticket mode, the system:
1. Forces first tool call (`toolChoice: "required"` at step 0)  
2. Continues forcing until 5+ tool calls made (`stepNumber <= 4 && totalToolCalls < 5`)
3. Uses enhanced research prompts requiring file exploration and dependency analysis

### Environment Configuration
Key environment variables for different features:
- **Database**: `POSTGRES_*` vars or `DATABASE_URL`
- **AI**: `GOOGLE_API_KEY`, `OPENAI_API_KEY`  
- **MCP**: `MCP_GITLAB_ENABLED=true`, `GITLAB_TOKEN`, `GITLAB_HOST`

## Database Schema

Uses Drizzle ORM with PostgreSQL:
- `threads`: Chat threads with summarization metadata
- `messages`: Individual messages with role, content, pinned status, optional tickets JSON
- Automatic summarization triggers at 3000+ tokens or 60+ messages

## Theme System

- Token-based theming via `src/theme.tokens.json` and `src/theme.css`
- CSS variables under `:root[data-theme]` for light/dark support
- Tailwind v4 utilities only - avoid hardcoded colors/spacing

## Testing Approach

No test runner configured yet. Preferred setup when adding tests:
- Vitest + React Testing Library
- Place tests beside code or under `src/**/__tests__/**`
- Focus on API routes, context building, and database actions

## MCP Tool Integration

The GitLab MCP server provides 11 research tools:
- `gather_repo_overview`: High-level project analysis
- `list_files`, `read_file`, `read_file_smart`: File system operations
- `search_code`: Repository-wide code search
- `get_project`, `list_branches`: GitLab API metadata
- `collect_review_bundle`: Curated context for code review

Tools auto-activate when GitLab URLs detected in user input, with intelligent project path resolution and prefetching.