/**
 * Typed settings configuration for Ollama UI
 *
 * This file defines the complete settings schema with defaults.
 * All settings are optional and fall back to sensible defaults.
 */

export interface AppSettings {
  // Title Generation Settings
  titleGeneration: {
    enabled: boolean;
    prompt: string;
    triggerAfterMessages: number;
    regenerateAfterMessages: number; // 0 = disabled, >0 = regenerate after N messages
    maxLength: number;
  };

  // Model Default Settings
  model: {
    defaultModel: string | null; // null = use first available
    defaultSystemPromptId: string | null;
    temperature: number;
    topP: number;
    contextWindow: 'auto' | number; // 'auto' or specific size like 8192
  };

  // UI Preferences
  ui: {
    theme: 'light' | 'dark' | 'system';
    autoScroll: boolean;
    showTimestamps: boolean;
    sidebarDefaultOpen: boolean;
    messageDisplayDensity: 'comfortable' | 'compact';
  };

  // General Settings
  general: {
    ollamaBaseUrl: string;
    autoSave: boolean;
    messageHistoryLimit: number; // 0 = unlimited
    enableMarkdownRendering: boolean;
    enableSyntaxHighlighting: boolean;
  };

  // Advanced Settings
  advanced: {
    streamTimeout: number; // milliseconds
    chunkTimeout: number; // milliseconds
    loggingLevel: 'debug' | 'info' | 'warn' | 'error';
    enableDebugMode: boolean;
    modelPollingInterval: number; // milliseconds
  };
}

/**
 * Default settings - everything works out of the box
 */
export const DEFAULT_SETTINGS: AppSettings = {
  titleGeneration: {
    enabled: true,
    prompt: `Based on this conversation, generate a concise 3-5 word title that captures the main topic. Only respond with the title, nothing else.

Conversation:
{conversation}

Title:`,
    triggerAfterMessages: 2,
    regenerateAfterMessages: 0, // disabled by default, can set to 8 for mid-conversation regeneration
    maxLength: 60,
  },

  model: {
    defaultModel: null,
    defaultSystemPromptId: null,
    temperature: 0.7,
    topP: 0.9,
    contextWindow: 'auto',
  },

  ui: {
    theme: 'system',
    autoScroll: true,
    showTimestamps: false,
    sidebarDefaultOpen: true,
    messageDisplayDensity: 'comfortable',
  },

  general: {
    ollamaBaseUrl: 'http://localhost:11434',
    autoSave: true,
    messageHistoryLimit: 0,
    enableMarkdownRendering: true,
    enableSyntaxHighlighting: true,
  },

  advanced: {
    streamTimeout: 120000, // 2 minutes
    chunkTimeout: 30000, // 30 seconds
    loggingLevel: 'info',
    enableDebugMode: false,
    modelPollingInterval: 15000, // 15 seconds
  },
};

/**
 * Settings key prefix for storage
 */
export const SETTINGS_PREFIX = 'settings.';

/**
 * Helper to convert flat key-value pairs to nested settings object
 */
export function parseSettings(keyValuePairs: Array<{ key: string; value: string }>): Partial<AppSettings> {
  const settings: any = {};

  for (const { key, value } of keyValuePairs) {
    // Remove prefix if present
    const cleanKey = key.startsWith(SETTINGS_PREFIX) ? key.slice(SETTINGS_PREFIX.length) : key;

    // Split by dots: 'titleGeneration.enabled' -> ['titleGeneration', 'enabled']
    const parts = cleanKey.split('.');

    // Navigate/create nested structure
    let current = settings;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    // Set the value with type coercion
    const lastKey = parts[parts.length - 1];
    current[lastKey] = parseSettingValue(value);
  }

  return settings;
}

/**
 * Helper to convert nested settings object to flat key-value pairs
 */
export function flattenSettings(settings: Partial<AppSettings>): Array<{ key: string; value: string }> {
  const result: Array<{ key: string; value: string }> = [];

  function flatten(obj: any, prefix: string = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        flatten(value, fullKey);
      } else {
        result.push({
          key: SETTINGS_PREFIX + fullKey,
          value: String(value),
        });
      }
    }
  }

  flatten(settings);
  return result;
}

/**
 * Parse string value to appropriate type
 */
function parseSettingValue(value: string): any {
  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Null
  if (value === 'null') return null;

  // Number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  // String
  return value;
}

/**
 * Deep merge settings with defaults
 */
export function mergeWithDefaults(partial: Partial<AppSettings>): AppSettings {
  return {
    titleGeneration: {
      ...DEFAULT_SETTINGS.titleGeneration,
      ...partial.titleGeneration,
    },
    model: {
      ...DEFAULT_SETTINGS.model,
      ...partial.model,
    },
    ui: {
      ...DEFAULT_SETTINGS.ui,
      ...partial.ui,
    },
    general: {
      ...DEFAULT_SETTINGS.general,
      ...partial.general,
    },
    advanced: {
      ...DEFAULT_SETTINGS.advanced,
      ...partial.advanced,
    },
  };
}
