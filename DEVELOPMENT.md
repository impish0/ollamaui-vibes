# Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

---

## 🧪 Quality Assurance: Run After Every Major Update

**IMPORTANT:** Always run these commands after major code changes to ensure quality:

### Full Quality Check (Recommended)
```bash
# Run all checks in sequence
npm run qa:full
```

### Individual Checks

#### 1. TypeScript Type Check
```bash
# Check client types
npx tsc --noEmit

# Check server types
npx tsc --project tsconfig.server.json --noEmit
```

#### 2. Build Verification
```bash
# Build client (Vite)
npm run build

# Build server (TypeScript)
npm run build:server
```

#### 3. Database Validation
```bash
# Validate Prisma schema
npx prisma validate

# Generate Prisma client (if schema changed)
npm run db:generate
```

#### 4. Development Server Test
```bash
# Start both servers and verify they run without errors
npm run dev

# Should see:
# ✓ Database connected
# ✓ Settings service initialized
# ✓ Ollama model polling started
# ✓ Vector service ready - RAG features enabled
# ✓ Server running at http://127.0.0.1:3001
# ✓ VITE ready at http://localhost:5173
```

---

## 📋 Pre-Commit Checklist

Before committing major changes:

- [ ] Run `npm run build` - Client build passes
- [ ] Run `npm run build:server` - Server build passes
- [ ] Run `npx tsc --noEmit` - No type errors
- [ ] Run `npm run dev` - Both servers start successfully
- [ ] Test new features manually in browser
- [ ] Check browser console for errors
- [ ] Check server logs for warnings

---

## 🚀 NPM Scripts Reference

### Development
```bash
npm run dev              # Start both client and server in watch mode
npm run dev:client       # Start only Vite dev server (port 5173)
npm run dev:server       # Start only Express server with tsx watch (port 3001)
```

### Building
```bash
npm run build            # Build client (TypeScript + Vite)
npm run build:server     # Build server with TypeScript
```

### Database
```bash
npm run db:migrate       # Run Prisma migrations
npm run db:generate      # Generate Prisma Client
npm run db:studio        # Open Prisma Studio GUI
```

### Quality Assurance
```bash
npm run qa:full          # Run all quality checks (build + type check)
npm run qa:build         # Build both client and server
npm run qa:types         # Check TypeScript types
```

---

## 🏗️ Project Structure

```
ollamaui-vibes/
├── src/
│   ├── client/           # React frontend
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components (Views)
│   │   ├── hooks/        # React Query hooks
│   │   ├── store/        # Zustand state management
│   │   └── utils/        # Utility functions
│   ├── server/           # Express backend
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic services
│   │   ├── middleware/   # Express middleware
│   │   └── utils/        # Server utilities
│   └── shared/           # Shared types between client/server
├── prisma/               # Database schema and migrations
├── dist/                 # Built client files (gitignored)
└── vector-data/          # HNSW vector indexes (gitignored)
```

---

## 🔍 Debugging

### Client Debugging
```bash
# Open browser DevTools
# Check Console tab for errors
# Use React DevTools for component inspection
# Use Network tab for API call debugging
```

### Server Debugging
```bash
# Server logs are output to console
# Check for error stack traces
# Use winston logger for structured logging
# Monitor API requests in Network tab
```

### Database Debugging
```bash
# Open Prisma Studio
npm run db:studio

# Check database schema
npx prisma db pull

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset
```

---

## 🧹 Common Issues & Solutions

### Build Fails with Type Errors
```bash
# Clean node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npm run db:generate
```

### Server Won't Start - Database Errors
```bash
# Check .env file exists and has DATABASE_URL
cat .env

# Run migrations
npm run db:migrate

# If persistent, reset database
npx prisma migrate reset
```

### Vite Build Warning: Large Chunks
```
This is normal for large dependencies.
To optimize, consider code-splitting with dynamic imports.
See: vite.config.ts > build.rollupOptions.output.manualChunks
```

### Ollama Not Reachable Warning
```bash
# Make sure Ollama is running
ollama serve

# Check if models are available
ollama list

# If needed, pull a model
ollama pull llama2
```

---

## 📊 Performance Best Practices

### Client Performance
- Use React.lazy() for code splitting
- Memoize expensive computations with useMemo
- Use React.memo for component optimization
- Virtualize long lists with react-window
- Debounce rapid user inputs

### Server Performance
- Cache frequently accessed data
- Use database indexes for queries
- Implement request caching where appropriate
- Monitor memory usage in production

### Database Performance
- Index frequently queried columns
- Use SELECT only needed columns
- Batch operations when possible
- Regular database maintenance

---

## 🔐 Security Checklist

- [ ] localhost-only binding (127.0.0.1)
- [ ] CORS restricted to localhost origins
- [ ] Rate limiting on API routes
- [ ] Input sanitization middleware
- [ ] SQL injection protection (Prisma)
- [ ] File upload size limits
- [ ] No sensitive data in logs
- [ ] Environment variables for secrets

---

## 📝 Code Style

### TypeScript
- Use strict mode
- Define explicit return types for functions
- Prefer interfaces over types for objects
- Use const assertions where appropriate

### React
- Functional components only
- Custom hooks for reusable logic
- Props interfaces with clear naming
- Handle loading and error states

### Backend
- RESTful API design
- Consistent error responses
- Validation with Zod schemas
- Structured logging with Winston

---

## 🚢 Deployment

### Production Build
```bash
# Build client and server
npm run build
npm run build:server

# Set production environment
export NODE_ENV=production

# Run database migrations
npm run db:migrate

# Start server (serves built client)
node dist/server/index.js
```

### Environment Variables (Production)
```bash
NODE_ENV=production
DATABASE_URL=file:./prod.db
OLLAMA_BASE_URL=http://localhost:11434
SERVER_PORT=3001
```

---

## 🤝 Contributing

1. Create a feature branch
2. Make changes
3. Run quality checks (`npm run qa:full`)
4. Commit with descriptive messages
5. Push and create pull request

---

## 📚 Resources

- [Vite Documentation](https://vite.dev/)
- [React Documentation](https://react.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [React Query Documentation](https://tanstack.com/query/latest)

---

**Happy coding! 🚀**
