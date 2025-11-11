import { Router } from 'express';
import { prisma } from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

// Get all prompt logs (paginated)
router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const chatId = req.query.chatId as string | undefined;

    const where = chatId ? { chatId } : {};

    const [logs, total] = await Promise.all([
      prisma.promptLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.promptLog.count({ where }),
    ]);

    res.json({
      logs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    next(error);
  }
});

// Get a single prompt log by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const log = await prisma.promptLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new ApiError('Prompt log not found', 404);
    }

    res.json(log);
  } catch (error) {
    next(error);
  }
});

// Delete a prompt log
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.promptLog.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Delete all logs for a chat
router.delete('/chat/:chatId', async (req, res, next) => {
  try {
    const { chatId } = req.params;

    const result = await prisma.promptLog.deleteMany({
      where: { chatId },
    });

    res.json({ success: true, deleted: result.count });
  } catch (error) {
    next(error);
  }
});

// Get statistics
router.get('/stats/summary', async (_req, res, next) => {
  try {
    const [
      totalLogs,
      totalTokens,
      avgResponseTime,
      modelStats,
    ] = await Promise.all([
      prisma.promptLog.count(),
      prisma.promptLog.aggregate({
        _sum: {
          estimatedTokens: true,
          responseTokens: true,
        },
      }),
      prisma.promptLog.aggregate({
        _avg: {
          responseTime: true,
        },
      }),
      prisma.$queryRaw`
        SELECT
          model,
          COUNT(*) as count,
          AVG(estimatedTokens) as avgInputTokens,
          AVG(responseTokens) as avgOutputTokens,
          AVG(responseTime) as avgResponseTime
        FROM PromptLog
        GROUP BY model
        ORDER BY count DESC
      `,
    ]);

    // Convert BigInt values to numbers for JSON serialization
    const serializedModelStats = (modelStats as any[]).map((stat) => ({
      model: stat.model,
      count: Number(stat.count),
      avgInputTokens: Number(stat.avgInputTokens) || 0,
      avgOutputTokens: Number(stat.avgOutputTokens) || 0,
      avgResponseTime: Number(stat.avgResponseTime) || 0,
    }));

    res.json({
      totalLogs,
      totalInputTokens: totalTokens._sum.estimatedTokens || 0,
      totalOutputTokens: totalTokens._sum.responseTokens || 0,
      avgResponseTime: avgResponseTime._avg.responseTime || 0,
      modelStats: serializedModelStats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
