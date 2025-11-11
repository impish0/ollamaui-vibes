import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { PromptService } from '../services/promptService.js';

const router = Router();

// Validation Schemas
const CreatePromptTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  collectionId: z.string().cuid().optional(),
  content: z.string().min(1).max(50000), // Initial version content
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
  isSystemPrompt: z.boolean().optional(),
});

const UpdatePromptTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  collectionId: z.string().cuid().optional().nullable(),
  content: z.string().min(1).max(50000).optional(), // Creates new version
  changeDescription: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
  isSystemPrompt: z.boolean().optional(),
});

const PromptIdSchema = z.object({
  id: z.string().cuid(),
});

const CreateVersionSchema = z.object({
  content: z.string().min(1).max(50000),
  changeDescription: z.string().max(500).optional(),
});

const InterpolateSchema = z.object({
  content: z.string(),
  variables: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
    })
  ),
});

const ImportPromptsSchema = z.object({
  prompts: z.array(
    z.object({
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      content: z.string().min(1).max(50000),
      collectionName: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
  ),
});

/**
 * GET /api/prompts
 * List all prompt templates with pagination and filtering
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { collectionId, favorite, search, limit = '100', offset = '0' } = req.query;

    const where: any = {};

    if (collectionId) {
      where.collectionId = collectionId as string;
    }

    if (favorite === 'true') {
      where.isFavorite = true;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const prompts = await prisma.promptTemplate.findMany({
      where,
      include: {
        collection: true,
        currentVersion: true,
        _count: {
          select: { versions: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    // Transform to include parsed tags
    const promptsWithTags = prompts.map((prompt) => ({
      ...prompt,
      tags: prompt.tags ? JSON.parse(prompt.tags) : [],
      versionCount: prompt._count.versions,
      _count: undefined,
    }));

    res.json(promptsWithTags);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts/:id
 * Get a specific prompt template with all versions
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = PromptIdSchema.parse(req.params);

    const prompt = await prisma.promptTemplate.findUnique({
      where: { id },
      include: {
        collection: true,
        currentVersion: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    // Parse tags and variables
    const promptWithParsed = {
      ...prompt,
      tags: prompt.tags ? JSON.parse(prompt.tags) : [],
      versions: prompt.versions?.map((v) => ({
        ...v,
        variables: v.variables ? JSON.parse(v.variables) : [],
      })),
    };

    res.json(promptWithParsed);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prompts
 * Create a new prompt template with initial version
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreatePromptTemplateSchema.parse(req.body);

    // Validate name
    if (!PromptService.validatePromptName(data.name)) {
      return res.status(400).json({
        error: 'Invalid prompt name. Use only alphanumeric characters, spaces, hyphens, and underscores.',
      });
    }

    // Check for duplicate name in collection
    const existing = await prisma.promptTemplate.findFirst({
      where: {
        name: data.name,
        collectionId: data.collectionId || null,
      },
    });

    if (existing) {
      return res.status(409).json({
        error: 'A prompt with this name already exists in this collection',
      });
    }

    // Extract variables from content
    const variables = PromptService.extractVariables(data.content);

    // Create prompt template with initial version
    const prompt = await prisma.promptTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        collectionId: data.collectionId,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        isFavorite: data.isFavorite || false,
        isSystemPrompt: data.isSystemPrompt || false,
        versions: {
          create: {
            content: data.content,
            variables: JSON.stringify(variables),
            versionNumber: 1,
          },
        },
      },
      include: {
        versions: true,
      },
    });

    // Set currentVersionId to the newly created version
    const updatedPrompt = await prisma.promptTemplate.update({
      where: { id: prompt.id },
      data: {
        currentVersionId: prompt.versions[0].id,
      },
      include: {
        collection: true,
        currentVersion: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    // Parse tags and variables for response
    const promptWithParsed = {
      ...updatedPrompt,
      tags: updatedPrompt.tags ? JSON.parse(updatedPrompt.tags) : [],
      versions: updatedPrompt.versions?.map((v) => ({
        ...v,
        variables: v.variables ? JSON.parse(v.variables) : [],
      })),
    };

    res.status(201).json(promptWithParsed);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/prompts/:id
 * Update a prompt template (creates new version if content is provided)
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = PromptIdSchema.parse(req.params);
    const data = UpdatePromptTemplateSchema.parse(req.body);

    // Validate name if provided
    if (data.name && !PromptService.validatePromptName(data.name)) {
      return res.status(400).json({
        error: 'Invalid prompt name. Use only alphanumeric characters, spaces, hyphens, and underscores.',
      });
    }

    // Check for duplicate name if updating name
    if (data.name) {
      const existing = await prisma.promptTemplate.findFirst({
        where: {
          name: data.name,
          collectionId: data.collectionId !== undefined ? data.collectionId : undefined,
          id: { not: id },
        },
      });

      if (existing) {
        return res.status(409).json({
          error: 'A prompt with this name already exists in this collection',
        });
      }
    }

    // If content is provided, create a new version
    let newVersionId: string | undefined;
    if (data.content) {
      const currentPrompt = await prisma.promptTemplate.findUnique({
        where: { id },
        include: { versions: true },
      });

      if (!currentPrompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      const maxVersion = Math.max(...currentPrompt.versions.map((v) => v.versionNumber), 0);
      const variables = PromptService.extractVariables(data.content);

      const newVersion = await prisma.promptVersion.create({
        data: {
          promptId: id,
          content: data.content,
          variables: JSON.stringify(variables),
          versionNumber: maxVersion + 1,
          changeDescription: data.changeDescription,
        },
      });

      newVersionId = newVersion.id;
    }

    // Update the prompt template
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.collectionId !== undefined) updateData.collectionId = data.collectionId;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.isFavorite !== undefined) updateData.isFavorite = data.isFavorite;
    if (data.isSystemPrompt !== undefined) updateData.isSystemPrompt = data.isSystemPrompt;
    if (newVersionId) updateData.currentVersionId = newVersionId;

    const prompt = await prisma.promptTemplate.update({
      where: { id },
      data: updateData,
      include: {
        collection: true,
        currentVersion: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    // Parse tags and variables for response
    const promptWithParsed = {
      ...prompt,
      tags: prompt.tags ? JSON.parse(prompt.tags) : [],
      versions: prompt.versions?.map((v) => ({
        ...v,
        variables: v.variables ? JSON.parse(v.variables) : [],
      })),
    };

    res.json(promptWithParsed);
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    next(error);
  }
});

/**
 * DELETE /api/prompts/:id
 * Delete a prompt template (cascades to all versions)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = PromptIdSchema.parse(req.params);

    await prisma.promptTemplate.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    next(error);
  }
});

/**
 * POST /api/prompts/:id/versions
 * Create a new version of a prompt
 */
router.post('/:id/versions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = PromptIdSchema.parse(req.params);
    const data = CreateVersionSchema.parse(req.body);

    const prompt = await prisma.promptTemplate.findUnique({
      where: { id },
      include: { versions: true },
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const maxVersion = Math.max(...prompt.versions.map((v) => v.versionNumber), 0);
    const variables = PromptService.extractVariables(data.content);

    const newVersion = await prisma.promptVersion.create({
      data: {
        promptId: id,
        content: data.content,
        variables: JSON.stringify(variables),
        versionNumber: maxVersion + 1,
        changeDescription: data.changeDescription,
      },
    });

    // Update currentVersionId
    await prisma.promptTemplate.update({
      where: { id },
      data: { currentVersionId: newVersion.id },
    });

    const versionWithParsed = {
      ...newVersion,
      variables: JSON.parse(newVersion.variables || '[]'),
    };

    res.status(201).json(versionWithParsed);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts/:id/versions/:versionNumber/diff
 * Get diff between two versions
 */
router.get('/:id/versions/:versionNumber/diff', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = PromptIdSchema.parse(req.params);
    const versionNumber = parseInt(req.params.versionNumber);
    const compareWith = req.query.compareWith ? parseInt(req.query.compareWith as string) : versionNumber - 1;

    if (isNaN(versionNumber) || isNaN(compareWith)) {
      return res.status(400).json({ error: 'Invalid version numbers' });
    }

    const versions = await prisma.promptVersion.findMany({
      where: {
        promptId: id,
        versionNumber: { in: [versionNumber, compareWith] },
      },
    });

    if (versions.length !== 2) {
      return res.status(404).json({ error: 'One or both versions not found' });
    }

    const oldVersion = versions.find((v) => v.versionNumber === compareWith);
    const newVersion = versions.find((v) => v.versionNumber === versionNumber);

    if (!oldVersion || !newVersion) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const diff = PromptService.generateDiff(oldVersion.content, newVersion.content);

    res.json({
      oldVersion: {
        versionNumber: oldVersion.versionNumber,
        createdAt: oldVersion.createdAt,
      },
      newVersion: {
        versionNumber: newVersion.versionNumber,
        createdAt: newVersion.createdAt,
      },
      diff,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prompts/:id/revert/:versionNumber
 * Revert to a specific version (creates new version with old content)
 */
router.post('/:id/revert/:versionNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = PromptIdSchema.parse(req.params);
    const versionNumber = parseInt(req.params.versionNumber);

    if (isNaN(versionNumber)) {
      return res.status(400).json({ error: 'Invalid version number' });
    }

    const targetVersion = await prisma.promptVersion.findFirst({
      where: {
        promptId: id,
        versionNumber,
      },
    });

    if (!targetVersion) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const prompt = await prisma.promptTemplate.findUnique({
      where: { id },
      include: { versions: true },
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const maxVersion = Math.max(...prompt.versions.map((v) => v.versionNumber), 0);

    const newVersion = await prisma.promptVersion.create({
      data: {
        promptId: id,
        content: targetVersion.content,
        variables: targetVersion.variables,
        versionNumber: maxVersion + 1,
        changeDescription: `Reverted to version ${versionNumber}`,
      },
    });

    await prisma.promptTemplate.update({
      where: { id },
      data: { currentVersionId: newVersion.id },
    });

    const versionWithParsed = {
      ...newVersion,
      variables: JSON.parse(newVersion.variables || '[]'),
    };

    res.status(201).json(versionWithParsed);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prompts/interpolate
 * Interpolate variables in prompt content
 */
router.post('/interpolate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, variables } = InterpolateSchema.parse(req.body);

    const interpolated = PromptService.interpolateVariables(content, variables);

    res.json({ content: interpolated });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prompts/import
 * Import prompts from JSON
 */
router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompts } = ImportPromptsSchema.parse(req.body);

    const results = [];

    for (const promptData of prompts) {
      // Find or create collection if specified
      let collectionId: string | undefined;
      if (promptData.collectionName) {
        let collection = await prisma.promptCollection.findUnique({
          where: { name: promptData.collectionName },
        });

        if (!collection) {
          collection = await prisma.promptCollection.create({
            data: { name: promptData.collectionName },
          });
        }

        collectionId = collection.id;
      }

      // Check if prompt already exists
      const existing = await prisma.promptTemplate.findFirst({
        where: {
          name: promptData.name,
          collectionId: collectionId || null,
        },
      });

      if (existing) {
        results.push({ name: promptData.name, status: 'skipped', reason: 'already exists' });
        continue;
      }

      // Create prompt
      const variables = PromptService.extractVariables(promptData.content);

      const prompt = await prisma.promptTemplate.create({
        data: {
          name: promptData.name,
          description: promptData.description,
          collectionId,
          tags: promptData.tags ? JSON.stringify(promptData.tags) : null,
          versions: {
            create: {
              content: promptData.content,
              variables: JSON.stringify(variables),
              versionNumber: 1,
            },
          },
        },
        include: {
          versions: true,
        },
      });

      await prisma.promptTemplate.update({
        where: { id: prompt.id },
        data: { currentVersionId: prompt.versions[0].id },
      });

      results.push({ name: promptData.name, status: 'imported', id: prompt.id });
    }

    res.json({ results });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts/export
 * Export all prompts to JSON
 */
router.get('/export', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const prompts = await prisma.promptTemplate.findMany({
      include: {
        collection: true,
        versions: {
          orderBy: { versionNumber: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const exportData = {
      prompts: prompts.map((prompt) => ({
        name: prompt.name,
        description: prompt.description,
        content: prompt.currentVersionId
          ? prompt.versions.find((v) => v.id === prompt.currentVersionId)?.content || ''
          : '',
        collectionName: prompt.collection?.name || null,
        tags: prompt.tags ? JSON.parse(prompt.tags) : [],
        versions: prompt.versions.map((v) => ({
          versionNumber: v.versionNumber,
          content: v.content,
          changeDescription: v.changeDescription,
          createdAt: v.createdAt.toISOString(),
        })),
        createdAt: prompt.createdAt.toISOString(),
        updatedAt: prompt.updatedAt.toISOString(),
      })),
      exportedAt: new Date().toISOString(),
    };

    res.json(exportData);
  } catch (error) {
    next(error);
  }
});

export default router;
