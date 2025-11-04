import { prisma } from '../db.js';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  parseSettings,
  flattenSettings,
  mergeWithDefaults,
  SETTINGS_PREFIX,
} from '../../shared/settings.js';
import { logInfo, logError } from '../utils/logger.js';

/**
 * Settings Service
 *
 * Manages application settings with:
 * - Type-safe access to settings
 * - Automatic fallback to defaults
 * - Efficient caching
 * - Batch updates
 */
class SettingsService {
  private cache: AppSettings | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute

  /**
   * Get all settings (merged with defaults)
   */
  async getSettings(): Promise<AppSettings> {
    // Return cached settings if still valid
    if (this.cache && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cache;
    }

    try {
      // Fetch all settings from database
      const dbSettings = await prisma.settings.findMany({
        where: {
          key: {
            startsWith: SETTINGS_PREFIX,
          },
        },
      });

      // Parse and merge with defaults
      const parsed = parseSettings(dbSettings);
      const merged = mergeWithDefaults(parsed);

      // Update cache
      this.cache = merged;
      this.cacheTimestamp = Date.now();

      return merged;
    } catch (error) {
      logError('Failed to load settings', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Update multiple settings at once
   */
  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    try {
      // Flatten the updates to key-value pairs
      const flattened = flattenSettings(updates);

      // Batch upsert all settings
      await Promise.all(
        flattened.map(({ key, value }) =>
          prisma.settings.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          })
        )
      );

      // Invalidate cache
      this.cache = null;

      logInfo('Settings updated', { count: flattened.length });

      // Return updated settings
      return await this.getSettings();
    } catch (error) {
      logError('Failed to update settings', error);
      throw error;
    }
  }

  /**
   * Get a specific setting value by path
   * Example: getSetting('titleGeneration.enabled')
   */
  async getSetting<T = any>(path: string): Promise<T> {
    const settings = await this.getSettings();
    const parts = path.split('.');

    let value: any = settings;
    for (const part of parts) {
      value = value?.[part];
    }

    return value as T;
  }

  /**
   * Update a specific setting value by path
   * Example: updateSetting('titleGeneration.enabled', false)
   */
  async updateSetting(path: string, value: any): Promise<AppSettings> {
    const parts = path.split('.');

    // Build partial settings object
    const update: any = {};
    let current = update;

    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;

    return await this.updateSettings(update);
  }

  /**
   * Reset all settings to defaults
   */
  async resetSettings(): Promise<AppSettings> {
    try {
      // Delete all settings
      await prisma.settings.deleteMany({
        where: {
          key: {
            startsWith: SETTINGS_PREFIX,
          },
        },
      });

      // Invalidate cache
      this.cache = null;

      logInfo('Settings reset to defaults');

      return DEFAULT_SETTINGS;
    } catch (error) {
      logError('Failed to reset settings', error);
      throw error;
    }
  }

  /**
   * Reset a specific category to defaults
   */
  async resetCategory(category: keyof AppSettings): Promise<AppSettings> {
    try {
      // Get the default values for this category
      const defaults = DEFAULT_SETTINGS[category];

      // Update with defaults
      return await this.updateSettings({ [category]: defaults } as Partial<AppSettings>);
    } catch (error) {
      logError('Failed to reset category', error, { category });
      throw error;
    }
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Initialize settings on server startup
   * Ensures Ollama base URL from env is saved to settings
   */
  async initialize(): Promise<void> {
    try {
      const settings = await this.getSettings();

      // If OLLAMA_BASE_URL is set in env, update settings
      const envBaseUrl = process.env.OLLAMA_BASE_URL;
      if (envBaseUrl && settings.general.ollamaBaseUrl !== envBaseUrl) {
        await this.updateSetting('general.ollamaBaseUrl', envBaseUrl);
        logInfo('Ollama base URL initialized from environment', { url: envBaseUrl });
      }

      logInfo('Settings service initialized');
    } catch (error) {
      logError('Failed to initialize settings', error);
    }
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
