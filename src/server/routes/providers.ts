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

    // Fetch available models from the provider
    let models: string[] = [];
    try {
      models = await fetchProviderModels(provider, apiKey);
    } catch (error) {
      console.warn(`Failed to fetch models for ${provider}:`, error);
      // Continue even if model fetch fails
    }

    // Upsert the provider
    await prisma.provider.upsert({
      where: { name: provider },
      update: {
        apiKey: encryptedKey,
        enabled: true,
        models: JSON.stringify(models),
        updatedAt: new Date(),
      },
      create: {
        name: provider,
        apiKey: encryptedKey,
        enabled: true,
        models: JSON.stringify(models),
      },
    });

    res.json({
      success: true,
      message: 'API key saved successfully',
      modelCount: models.length
    });
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
 * GET /api/providers/models
 * Get all available models from enabled providers
 */
router.get('/models', async (_req, res, _next) => {
  try {
    const providers = await prisma.provider.findMany({
      where: { enabled: true },
      select: {
        name: true,
        models: true,
      },
    });

    const allModels = providers.flatMap((provider) => {
      if (!provider.models) return [];
      try {
        const models = JSON.parse(provider.models) as string[];
        return models.map((modelId) => ({
          id: modelId,
          name: modelId,
          provider: provider.name,
        }));
      } catch (error) {
        console.error(`Failed to parse models for ${provider.name}:`, error);
        return [];
      }
    });

    res.json({ models: allModels });
  } catch (error) {
    console.error('Error fetching provider models:', error);
    res.status(500).json({ error: 'Failed to fetch provider models' });
  }
});

/**
 * POST /api/providers/refresh/:provider
 * Refresh models list for a provider
 */
router.post('/refresh/:provider', async (req, res, _next) => {
  try {
    const { provider } = req.params;

    if (!['openai', 'anthropic', 'groq', 'google'].includes(provider)) {
      res.status(400).json({ error: 'Invalid provider' });
      return;
    }

    // Get the provider's API key
    const providerRecord = await prisma.provider.findUnique({
      where: { name: provider },
      select: { apiKey: true },
    });

    if (!providerRecord) {
      res.status(404).json({ error: 'Provider not found. Please save an API key first.' });
      return;
    }

    // Decrypt the API key
    const apiKey = decryptApiKey(providerRecord.apiKey);

    // Fetch fresh models
    const models = await fetchProviderModels(provider, apiKey);

    // Update the provider with new models
    await prisma.provider.update({
      where: { name: provider },
      data: {
        models: JSON.stringify(models),
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Models refreshed successfully',
      modelCount: models.length,
      models,
    });
  } catch (error) {
    console.error('Error refreshing provider models:', error);
    res.status(500).json({ error: 'Failed to refresh models' });
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

// Fetch available models from a provider
async function fetchProviderModels(provider: string, apiKey: string): Promise<string[]> {
  switch (provider) {
    case 'openai':
      return await fetchOpenAIModels(apiKey);
    case 'anthropic':
      return await fetchAnthropicModels();
    case 'groq':
      return await fetchGroqModels(apiKey);
    case 'google':
      return await fetchGoogleModels(apiKey);
    default:
      return [];
  }
}

// Model fetch functions for each provider
async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) return [];

    const data = await response.json();
    return data.data
      .filter((model: any) => model.id.includes('gpt'))
      .map((model: any) => model.id)
      .sort();
  } catch (error) {
    console.error('Error fetching OpenAI models:', error);
    return [];
  }
}

async function fetchAnthropicModels(): Promise<string[]> {
  // Anthropic doesn't have a public models API, return known models
  return [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];
}

async function fetchGroqModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) return [];

    const data = await response.json();
    return data.data.map((model: any) => model.id).sort();
  } catch (error) {
    console.error('Error fetching Groq models:', error);
    return [];
  }
}

async function fetchGoogleModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    if (!response.ok) return [];

    const data = await response.json();
    return data.models
      .filter((model: any) => model.name.includes('gemini'))
      .map((model: any) => model.name.replace('models/', ''))
      .sort();
  } catch (error) {
    console.error('Error fetching Google models:', error);
    return [];
  }
}

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
