# Ollama UI Vibes 🚀

A beautiful, fast, and feature-rich web interface for interacting with local Ollama models.

## Features

- 🎨 **Beautiful Modern UI** - Clean, responsive interface with dark/light mode
- ⚡ **Real-time Streaming** - Smooth streaming responses with markdown rendering
- 💬 **Multi-Chat Support** - Create and manage multiple chat conversations
- 🔄 **Side-by-Side Comparison** - Compare responses from different models (coming soon)
- 📝 **System Prompts** - Create, manage, and apply custom system prompts to any chat
- 🤖 **Auto Model Polling** - Automatically detects available Ollama models
- 📊 **Auto Title Generation** - AI-generated titles for your conversations
- 💾 **SQLite Storage** - All data stored locally in SQLite database
- 🔒 **Localhost Security** - Built-in security to prevent unauthorized network access

## Prerequisites

- Node.js 18+ and npm
- [Ollama](https://ollama.ai/) installed and running locally

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up the database:**
   ```bash
   npm run db:migrate
   ```

3. **Start the application:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:5173](http://localhost:5173)

## Available Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run dev:client` - Start only the Vite dev server
- `npm run dev:server` - Start only the Express API server
- `npm run build` - Build the production bundle
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma Client
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Configuration

The application can be configured via environment variables in the `.env` file:

```env
OLLAMA_BASE_URL=http://localhost:11434
SERVER_PORT=3001
NODE_ENV=development
DATABASE_URL="file:./dev.db"
```

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v3
- **Backend:** Express + Node.js
- **Database:** SQLite + Prisma ORM
- **State Management:** Zustand
- **Markdown:** react-markdown with syntax highlighting
- **AI:** Ollama (local models)

## Features in Detail

### Chat Management
- Create new chats with any available model
- View all your chat history in the sidebar
- Delete chats you no longer need
- Auto-generated titles based on conversation content

### System Prompts
- Create reusable system prompts
- Apply different prompts to different chats
- Edit and delete prompts as needed
- Quick-select from dropdown in chat header

### Model Selection
- Automatically polls Ollama for available models every 15 seconds
- Shows model size and parameter info
- Switch models mid-conversation
- Remembers the last model used per chat

### Streaming
- Real-time streaming of AI responses
- Progressive markdown rendering
- Syntax highlighting for code blocks
- Smooth typing indicators

### Security
- Server binds to 127.0.0.1 (localhost only)
- CORS restricted to localhost origins
- Rate limiting on API endpoints
- Input sanitization

## Project Structure

```
/
├── src/
│   ├── client/          # React frontend
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── services/    # API services
│   │   ├── store/       # Zustand state management
│   │   └── App.tsx      # Main app component
│   ├── server/          # Express backend
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── middleware/  # Express middleware
│   └── shared/          # Shared types
├── prisma/              # Database schema & migrations
└── public/              # Static assets
```

## Development

The application runs in development mode with:
- Hot module replacement (HMR) for the frontend
- Auto-restart for the backend via tsx watch
- Vite proxy for seamless API calls

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
