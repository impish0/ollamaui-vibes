# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ollama UI Vibes is a full-stack web application for interacting with local Ollama AI models. It consists of a React frontend (Vite) and an Express backend with SQLite database via Prisma ORM.

## Essential Commands

### Development
```bash
npm run dev                 # Start both client (5173) and server (3001) in watch mode
npm run dev:client          # Start only Vite dev server on port 5173
npm run dev:server          # Start only Express server with tsx watch on port 3001
```

### Database
```bash
npm run db:migrate          # Run Prisma migrations (required after schema changes or initial setup)
npm run db:generate         # Generate Prisma Client (required after schema changes)
npm run db:studio           # Open Prisma Studio GUI for database inspection
```

### Build
```bash
npm run build               # Build client (TypeScript + Vite)
npm run build:server        # Build server with TypeScript (tsconfig.server.json)
```

## Architecture

### Client-Server Communication
- Frontend runs on `localhost:5173` via Vite dev server
- Backend runs on `localhost:3001` (Express)
- Vite proxy forwards `/api/*` requests to backend (configured in [vite.config.ts](vite.config.ts))
- Backend binds to `127.0.0.1` (localhost only) for security

### State Management
- Zustand store in [src/client/store/chatStore.ts](src/client/store/chatStore.ts) manages all client state
- Single global store pattern with no Redux or Context API
- State includes: chats, messages, models, system prompts, streaming status, UI state (dark mode, sidebar)

### Database Schema (Prisma)
Located in [prisma/schema.prisma](prisma/schema.prisma):
- **Chat** - Conversation containers with title, model, optional systemPrompt
- **Message** - Individual messages (user/assistant/system) with cascade delete on chat removal
- **SystemPrompt** - Reusable prompt templates with unique names
- **Settings** - Key-value store for app configuration (e.g., Ollama base URL)
- **Collection** - RAG document collections with configurable embedding models
- **Document** - Uploaded documents with processing status, chunk count, and metadata

All models use `cuid()` for IDs. Messages have cascading deletes when parent chat is deleted.

### Ollama Integration
The [src/server/services/ollamaService.ts](src/server/services/ollamaService.ts) handles all Ollama interactions:
- Singleton service instantiated with `OLLAMA_BASE_URL` from env
- Auto-polling for available models every 15 seconds (started on server init)
- Streaming chat via async generator pattern (`streamChat` method)
- Non-streaming completion for title generation (`generateCompletion`)
- Models cached in-memory to reduce API calls

### API Routes
All routes in [src/server/routes/](src/server/routes/):
- `/api/chats` - CRUD for chats
- `/api/messages` - Create messages, stream chat responses (SSE)
- `/api/system-prompts` - CRUD for system prompts
- `/api/ollama` - Get models, health check, update base URL, get embedding models
- `/api/collections` - CRUD for RAG collections
- `/api/documents` - Upload, list, delete, search documents

The `/api/messages/stream` endpoint uses Server-Sent Events (SSE) to stream Ollama responses in real-time.

### RAG (Retrieval-Augmented Generation)
Full RAG pipeline with pure JavaScript vector search:
- **Vector Storage**: hnswlib-node (HNSW algorithm, no server required!)
  - Stores vectors in local `./vector-data` directory
  - Zero configuration, works out of the box
  - Persistent across server restarts
- **Embedding Models**: Configurable per collection (see [EMBEDDING_MODELS.md](EMBEDDING_MODELS.md))
  - Recommended: `qwen3-embedding:8b` (best), `mxbai-embed-large`, `nomic-embed-text`
  - Each collection can use a different embedding model
  - Get available models: `GET /api/ollama/models/embeddings`
- **Document Processing**: PDF, DOCX, TXT, MD, JSON, CSV, and code files
- **Text Chunking**: Smart 512-char chunks with 50-char overlap
- **Context Injection**: Automatically retrieves top-5 relevant chunks and injects into chat
- **Services**:
  - [vectorService.ts](src/server/services/vectorService.ts) - HNSW vector operations
  - [embeddingService.ts](src/server/services/embeddingService.ts) - Text chunking & embeddings
  - [documentService.ts](src/server/services/documentService.ts) - File parsing & orchestration

### Security Middleware
Located in [src/server/middleware/security.ts](src/server/middleware/security.ts):
- `localhostOnly` - Rejects requests not from 127.0.0.1 or ::1
- `apiLimiter` - Rate limiting on `/api/*` routes
- `sanitizeInput` - Input sanitization middleware
- CORS restricted to `http://localhost:5173` and `http://127.0.0.1:5173`

### Path Aliases
Configured in [vite.config.ts](vite.config.ts) and [tsconfig.json](tsconfig.json):
- `@/` → `./src/`
- `@client/` → `./src/client/`
- `@server/` → `./src/server/`
- `@shared/` → `./src/shared/`

Use these for imports instead of relative paths.

### Shared Types
All TypeScript interfaces are in [src/shared/types.ts](src/shared/types.ts) and used by both client and server. This includes domain models (Chat, Message, SystemPrompt), API request/response types, and Ollama-specific types.

### Auto Title Generation
After the first user message and assistant response, the server automatically generates a chat title using [src/server/services/titleGenerator.ts](src/server/services/titleGenerator.ts). It uses the same Ollama model from the chat to create a concise title from the conversation context.

## Key Behaviors

### Model Polling
The server polls Ollama's `/api/tags` endpoint every 15 seconds to keep the model list fresh. The client can request models via `/api/ollama/models`, which returns the cached list with a timestamp.

### Streaming Messages
When sending a message:
1. Client creates user message via POST `/api/messages`
2. Client initiates SSE connection to `/api/messages/stream?chatId=...`
3. Server streams chunks from Ollama as they arrive
4. After stream completes, server saves assistant message to database
5. Server triggers title generation if this is the first exchange

### System Prompts
System prompts are optional and can be assigned to chats. When set, the prompt content is prepended to the message history as a system message before sending to Ollama. This affects the entire conversation context.

## Environment Variables

See [.env.example](.env.example):
- `OLLAMA_BASE_URL` - Ollama server URL (default: `http://localhost:11434`)
- `SERVER_PORT` - Express server port (default: `3001`)
- `NODE_ENV` - Environment mode
- `DATABASE_URL` - Prisma SQLite connection string (default: `file:./dev.db`)
  - Note: Path is relative to the `prisma/` directory, so `file:./dev.db` creates the database at `prisma/dev.db`

## Development Workflow

1. Ensure Ollama is running: `ollama serve`
2. Ensure at least one model is pulled: `ollama pull llama2`
3. **(Optional) For RAG features**: Pull an embedding model: `ollama pull nomic-embed-text` (or see [EMBEDDING_MODELS.md](EMBEDDING_MODELS.md) for better options)
4. Run migrations if needed: `npm run db:migrate`
5. Start dev servers: `npm run dev`
6. Frontend available at `http://localhost:5173`
7. API available at `http://localhost:3001/api`

**Note**: RAG features work automatically with no additional setup! Vector service runs in-process and stores indexes in `./vector-data`.

## Notable Implementation Details

- **URL-based routing**: Chats have URLs like `#/chat/{chatId}` that persist on page refresh and work with browser back/forward buttons
- **Dark mode**: Persisted in localStorage, applied via Tailwind's `dark:` classes
- **Markdown rendering**: Uses `react-markdown` with `remark-gfm` for GitHub-flavored markdown and `rehype-highlight` for syntax highlighting in code blocks
- **Graceful shutdown**: Server handles SIGINT/SIGTERM to stop model polling and disconnect Prisma
- **No authentication**: Security relies on localhost-only binding and CORS restrictions
