import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../utils/encryption';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const SaveKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'groq', 'google']),
  apiKey: z.string().min(1),
});

const TestKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'groq', 'google']),
  apiKey: z.string().min(1),
});

/**
 * GET /api/providers/keys
 * Get all saved provider API keys (masked)
 */
router.get('/keys', async (_req, res, _next) => {
  try {
    const providers = await prisma.provider.findMany({
      select: {
        name: true,
        enabled: true,
        lastTested: true,
        testStatus: true,
        apiKey: true,
      },
    });

    // Return masked keys for security
    const maskedProviders = providers.reduce((acc, provider) => {
      acc[provider.name] = maskApiKey(decryptApiKey(provider.apiKey));
      return acc;
    }, {} as Record<string, string>);

    res.json(maskedProviders);
  } catch (error) {
    console.error('Error fetching provider keys:', error);
    res.status(500).json({ error: 'Failed to fetch provider keys' });
  }
});

/**
 * POST /api/providers/keys
 * Save or update a provider API key
 */
router.post('/keys', async (req, res, _next) => {
  try {
    const { provider, apiKey } = SaveKeySchema.parse(req.body);

    // Encrypt the API key
    const encryptedKey = encryptApiKey(apiKey);

    // Upsert the provider
    await prisma.provider.upsert({
      where: { name: provider },
      update: {
        apiKey: encryptedKey,
        enabled: true,
        updatedAt: new Date(),
      },
      create: {
        name: provider,
        apiKey: encryptedKey,
        enabled: true,
      },
    });

    res.json({ success: true, message: 'API key saved successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
      return;
    }
    console.error('Error saving provider key:', error);
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

/**
 * POST /api/providers/test
 * Test a provider API key validity
 */
router.post('/test', async (req, res, _next) => {
  try {
    const { provider, apiKey } = TestKeySchema.parse(req.body);

    let isValid = false;
    let error: string | null = null;

    // Test the API key with a simple request
    switch (provider) {
      case 'openai':
        isValid = await testOpenAI(apiKey);
        break;
      case 'anthropic':
        isValid = await testAnthropic(apiKey);
        break;
      case 'groq':
        isValid = await testGroq(apiKey);
        break;
      case 'google':
        isValid = await testGoogle(apiKey);
        break;
      default:
        error = 'Unknown provider';
    }

    if (isValid) {
      // Update test status in database if provider exists
      await prisma.provider.updateMany({
        where: { name: provider },
        data: {
          lastTested: new Date(),
          testStatus: 'success',
        },
      });

      res.json({ success: true, message: 'API key is valid' });
    } else {
      // Update test status to error
      await prisma.provider.updateMany({
        where: { name: provider },
        data: {
          lastTested: new Date(),
          testStatus: 'error',
        },
      });

      res.status(401).json({ error: error || 'Invalid API key' });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
      return;
    }
    console.error('Error testing provider key:', error);
    res.status(500).json({ error: 'Failed to test API key' });
  }
});

/**
 * DELETE /api/providers/keys/:provider
 * Remove a provider API key
 */
router.delete('/keys/:provider', async (req, res, _next) => {
  try {
    const { provider } = req.params;

    if (!['openai', 'anthropic', 'groq', 'google'].includes(provider)) {
      res.status(400).json({ error: 'Invalid provider' });
      return;
    }

    await prisma.provider.delete({
      where: { name: provider },
    });

    res.json({ success: true, message: 'API key removed successfully' });
  } catch (error) {
    console.error('Error deleting provider key:', error);
    res.status(500).json({ error: 'Failed to remove API key' });
  }
});

// Test functions for each provider
async function testOpenAI(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.error('OpenAI test error:', error);
    return false;
  }
}

async function testAnthropic(apiKey: string): Promise<boolean> {
  try {
    // Anthropic doesn't have a simple list endpoint, so we'll do a minimal completion
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Anthropic test error:', error);
    return false;
  }
}

async function testGroq(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Groq test error:', error);
    return false;
  }
}

async function testGoogle(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    return response.ok;
  } catch (error) {
    console.error('Google test error:', error);
    return false;
  }
}

export default router;
