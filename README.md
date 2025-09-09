# Prompt to Issue

A Next.js 15 + React 19 chat application with AI integration, featuring dual modes (assistant and ticket generation), GitLab integration for issue management, and comprehensive ticket workflow automation.

## ✨ Features

- **Dual Chat Modes**: Assistant mode for general AI chat, Ticket mode for structured issue generation
- **GitLab Integration**: OAuth authentication, project/milestone selection, automatic issue creation
- **Model Context Protocol (MCP)**: Repository analysis and intelligent code research
- **Resizable Interface**: Side-by-side ticket management with drag-to-resize panels
- **Smart Context Management**: Token budgeting, summarization, and pinned message preservation
- **Multi-Provider AI Support**: Google Gemini and OpenAI integration

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the example environment file and configure:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Database (PostgreSQL)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=prompttoissuev3
POSTGRES_SSL=false

# AI Providers (at least one required)
AI_PROVIDER=google
GOOGLE_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key

# GitLab OAuth (optional, for GitLab integration)
GITLAB_OAUTH_CLIENT_ID=your_gitlab_application_id
GITLAB_OAUTH_CLIENT_SECRET=your_gitlab_application_secret
GITLAB_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/gitlab/callback
NEXTAUTH_SECRET=your_random_secret_for_sessions

# MCP Integration (optional, for repository analysis)
MCP_GITLAB_ENABLED=true
GITLAB_TOKEN=your_gitlab_personal_access_token
GITLAB_HOST=https://gitlab.com
```

### 3. Database Setup

Start PostgreSQL and initialize the schema:

```bash
# Start database
docker compose up -d db

# Push schema to database
npm run db:push
```

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start using the application.

## 📖 Documentation

- [GitLab OAuth Setup Guide](./docs/GITLAB_OAUTH_SETUP.md) - Complete setup instructions for GitLab integration
- [TODO & Roadmap](./docs/TODO.md) - Development progress and future plans
- [Architecture Diagrams](./docs/) - System topology, data flow, and component relationships (Mermaid diagrams)

## 🎯 Usage

### Chat Modes

- **Assistant Mode**: General AI conversation and assistance
- **Ticket Mode**: Converts requirements into structured, editable tickets

### GitLab Integration

1. Go to **Settings → Connectors**
2. Choose **GitLab OAuth** and click **Connect**
3. Authorize with GitLab and return to the app
4. Create tickets and sync them to GitLab issues automatically

### Ticket Management

- **Same Mode**: All tickets created in the same project/milestone
- **Multiple Mode**: Each ticket can have its own project/milestone assignment
- **Side-by-Side View**: Resizable panel for ticket editing while chatting

## 🛠 Development Commands

```bash
# Development
npm run dev                 # Start dev server (http://localhost:3000)
npm run build              # Production build with Turbopack
npm start                  # Run production server

# Code Quality
npm run lint               # Run Biome linter (check only)
npm run lint:fix           # Run Biome with auto-fixes (safe)
npm run format             # Format code with Biome

# Database (Drizzle)
npm run db:generate        # Generate migration files
npm run db:push            # Apply schema changes to database

# MCP GitLab Server (debugging)
npm run mcp:gitlab         # Run GitLab MCP server directly
```

## 🏗 Architecture

### Core Components

- **API Layer** (`src/app/api/`): Chat endpoints, GitLab OAuth, thread management
- **LLM Integration** (`src/lib/llm.ts`): Provider abstraction, MCP tool integration
- **GitLab Service** (`src/lib/gitlab/`): Complete GitLab API integration
- **Ticket System** (`src/lib/tickets.ts`): Zod-validated schemas and management
- **MCP System** (`src/mcp/`): Repository analysis and code research tools

### Key Features

- **Token-budget-aware context building** with automatic summarization
- **Pinned message preservation** during context management  
- **Automatic GitLab re-authentication** on token expiration
- **Resizable panels** using react-resizable-panels
- **Theme system** with CSS variables and dark/light mode support

## 🔧 Configuration

### Database Schema

Uses Drizzle ORM with PostgreSQL:
- `threads`: Chat conversations with summarization metadata
- `messages`: Individual messages with role, content, tickets, and pinned status

### Theme System

- Token-based theming via `src/theme.tokens.json`
- CSS variables under `:root[data-theme]` for light/dark support
- Tailwind v4 utilities with semantic color tokens

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `POSTGRES_*` | Database connection | Yes |
| `AI_PROVIDER` | google or openai | Yes |
| `GOOGLE_API_KEY` | Google Gemini API key | If using Google |
| `OPENAI_API_KEY` | OpenAI API key | If using OpenAI |
| `GITLAB_OAUTH_*` | GitLab OAuth credentials | For GitLab integration |
| `MCP_GITLAB_ENABLED` | Enable MCP GitLab tools | For repo analysis |

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Update GitLab OAuth redirect URI to production domain

### Docker

```bash
# Build and run with Docker Compose
docker compose up --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- [Next.js Documentation](https://nextjs.org/docs)
- [GitLab API Documentation](https://docs.gitlab.com/ee/api/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [React Resizable Panels](https://github.com/bvaughn/react-resizable-panels)