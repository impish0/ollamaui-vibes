import { Router } from 'express';
import { settingsService } from '../services/settingsService.js';
import { validateBody } from '../middleware/validation.js';
import { updateSettingsSchema } from '../validation/schemas.js';
import { logInfo } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/settings
 * Get all settings (merged with defaults)
 */
router.get('/', async (_req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/settings
 * Update multiple settings
 * Body: Partial<AppSettings>
 */
router.put('/', validateBody(updateSettingsSchema), async (req, res, next) => {
  try {
    const updates = req.body;
    const settings = await settingsService.updateSettings(updates);

    logInfo('Settings updated via API', { updates });
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/settings/:path
 * Get a specific setting by path
 * Example: GET /api/settings/titleGeneration.enabled
 */
router.get('/:category/:key', async (req, res, next) => {
  try {
    const { category, key } = req.params;
    const path = `${category}.${key}`;

    const value = await settingsService.getSetting(path);
    res.json({ path, value });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/settings/:path
 * Update a specific setting by path
 * Body: { value: any }
 * Example: PUT /api/settings/titleGeneration.enabled { "value": false }
 */
router.put('/:category/:key', async (req, res, next) => {
  try {
    const { category, key } = req.params;
    const { value } = req.body;
    const path = `${category}.${key}`;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const settings = await settingsService.updateSetting(path, value);

    logInfo('Setting updated via API', { path, value });
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/settings/reset
 * Reset all settings to defaults
 */
router.post('/reset', async (_req, res, next) => {
  try {
    const settings = await settingsService.resetSettings();

    logInfo('Settings reset to defaults via API');
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/settings/reset/:category
 * Reset a specific category to defaults
 * Example: POST /api/settings/reset/titleGeneration
 */
router.post('/reset/:category', async (req, res, next) => {
  try {
    const { category } = req.params;

    // Validate category
    const validCategories = ['titleGeneration', 'model', 'ui', 'general', 'advanced'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const settings = await settingsService.resetCategory(category as any);

    logInfo('Settings category reset via API', { category });
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/settings/cache/clear
 * Clear settings cache (for development/debugging)
 */
router.post('/cache/clear', async (_req, res, next) => {
  try {
    settingsService.clearCache();
    logInfo('Settings cache cleared');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
