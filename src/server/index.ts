import express from 'express';
import cors from 'cors';
import { prisma } from './db.js';
import { ollamaService } from './services/ollamaService.js';
import { settingsService } from './services/settingsService.js';
import { localhostOnly, apiLimiter, sanitizeInput } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger, logError, logInfo } from './utils/logger.js';
import chatsRouter from './routes/chats.js';
import messagesRouter from './routes/messages.js';
import systemPromptsRouter from './routes/systemPrompts.js';
import ollamaRouter from './routes/ollama.js';
import settingsRouter from './routes/settings.js';

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
app.use('/api/settings', settingsRouter);

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
    logInfo('✓ Database connected');

    // Initialize settings service (loads from DB and env)
    await settingsService.initialize();
    logInfo('✓ Settings service initialized');

    // Load Ollama base URL from settings
    const settings = await settingsService.getSettings();
    ollamaService.setBaseUrl(settings.general.ollamaBaseUrl);
    logInfo('Ollama base URL loaded from settings', { baseUrl: settings.general.ollamaBaseUrl });

    // Start model polling
    ollamaService.startModelPolling(15000); // Poll every 15 seconds
    logInfo('✓ Ollama model polling started');

    // Check Ollama connection
    const healthy = await ollamaService.healthCheck();
    if (healthy) {
      logInfo(`✓ Ollama connected`, { baseUrl: ollamaService.getBaseUrl() });
    } else {
      logger.warn(`⚠ Ollama not reachable`, { baseUrl: ollamaService.getBaseUrl() });
    }

    // Start listening
    app.listen(PORT, '127.0.0.1', () => {
      logInfo(`✓ Server running`, {
        url: `http://127.0.0.1:${PORT}`,
        environment: process.env.NODE_ENV || 'development'
      });
    });
  } catch (error) {
    logError('Failed to start server', error);
    process.exit(1);
  }
}

// Cleanup on shutdown
process.on('SIGINT', async () => {
  logInfo('\nShutting down gracefully...');
  ollamaService.stopModelPolling();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logInfo('\nShutting down gracefully...');
  ollamaService.stopModelPolling();
  await prisma.$disconnect();
  process.exit(0);
});

start();
