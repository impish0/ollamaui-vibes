import express from 'express';
import cors from 'cors';
import { prisma } from './db.js';
import { ollamaService } from './services/ollamaService.js';
import { localhostOnly, apiLimiter, sanitizeInput } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import chatsRouter from './routes/chats.js';
import messagesRouter from './routes/messages.js';
import systemPromptsRouter from './routes/systemPrompts.js';
import ollamaRouter from './routes/ollama.js';

const app = express();
const PORT = parseInt(process.env.SERVER_PORT || '3001', 10);

// Security middleware
app.use(localhostOnly);
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/chats', chatsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/system-prompts', systemPromptsRouter);
app.use('/api/ollama', ollamaRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Start server
async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✓ Database connected');

    // Load Ollama base URL from settings
    const ollamaUrlSetting = await prisma.settings.findUnique({
      where: { key: 'ollamaBaseUrl' },
    });

    if (ollamaUrlSetting) {
      ollamaService.setBaseUrl(ollamaUrlSetting.value);
    }

    // Start model polling
    ollamaService.startModelPolling(15000); // Poll every 15 seconds
    console.log('✓ Ollama model polling started');

    // Check Ollama connection
    const healthy = await ollamaService.healthCheck();
    if (healthy) {
      console.log(`✓ Ollama connected at ${ollamaService.getBaseUrl()}`);
    } else {
      console.warn(`⚠ Ollama not reachable at ${ollamaService.getBaseUrl()}`);
    }

    // Start listening
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`✓ Server running on http://127.0.0.1:${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Cleanup on shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  ollamaService.stopModelPolling();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  ollamaService.stopModelPolling();
  await prisma.$disconnect();
  process.exit(0);
});

start();
