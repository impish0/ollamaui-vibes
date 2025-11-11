import { useState } from 'react';
import { ModelParameters as ModelParametersType } from '@shared/types';
import { Settings, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface ModelParametersProps {
  parameters: ModelParametersType;
  onChange: (parameters: ModelParametersType) => void;
  compact?: boolean;
}

interface Preset {
  name: string;
  description: string;
  parameters: ModelParametersType;
}

const PRESETS: Preset[] = [
  {
    name: 'Precise',
    description: 'Focused and deterministic responses',
    parameters: {
      temperature: 0.1,
      top_p: 0.9,
      top_k: 10,
      repeat_penalty: 1.1,
    },
  },
  {
    name: 'Balanced',
    description: 'Good balance between creativity and consistency',
    parameters: {
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      repeat_penalty: 1.1,
    },
  },
  {
    name: 'Creative',
    description: 'More varied and creative responses',
    parameters: {
      temperature: 1.2,
      top_p: 0.95,
      top_k: 80,
      repeat_penalty: 1.05,
    },
  },
  {
    name: 'Very Creative',
    description: 'Maximum creativity and variation',
    parameters: {
      temperature: 1.8,
      top_p: 0.98,
      top_k: 100,
      repeat_penalty: 1.0,
    },
  },
];

const DEFAULT_PARAMETERS: ModelParametersType = {
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  repeat_penalty: 1.1,
};

export function ModelParameters({ parameters, onChange, compact = false }: ModelParametersProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const handleChange = (key: keyof ModelParametersType, value: number | undefined) => {
    onChange({
      ...parameters,
      [key]: value,
    });
  };

  const handlePreset = (preset: Preset) => {
    onChange(preset.parameters);
  };

  const handleReset = () => {
    onChange(DEFAULT_PARAMETERS);
  };

  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Settings className="w-4 h-4" />
        <span>Model Parameters</span>
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Model Parameters</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Presets
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePreset(preset)}
              className="px-3 py-2 text-sm text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
            >
              <div className="font-medium text-gray-900 dark:text-white">{preset.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Temperature</label>
          <input
            type="number"
            value={parameters.temperature ?? 0.7}
            onChange={(e) => handleChange('temperature', parseFloat(e.target.value) || 0)}
            step="0.1"
            min="0"
            max="2"
            className="w-16 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
          />
        </div>
        <input
          type="range"
          value={parameters.temperature ?? 0.7}
          onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
          step="0.1"
          min="0"
          max="2"
          className="w-full"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Controls randomness. Lower = more focused, Higher = more creative
        </p>
      </div>

      {/* Top P */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Top P</label>
          <input
            type="number"
            value={parameters.top_p ?? 0.9}
            onChange={(e) => handleChange('top_p', parseFloat(e.target.value) || 0)}
            step="0.05"
            min="0"
            max="1"
            className="w-16 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
          />
        </div>
        <input
          type="range"
          value={parameters.top_p ?? 0.9}
          onChange={(e) => handleChange('top_p', parseFloat(e.target.value))}
          step="0.05"
          min="0"
          max="1"
          className="w-full"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Nucleus sampling. Lower = more focused on likely tokens
        </p>
      </div>

      {/* Top K */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Top K</label>
          <input
            type="number"
            value={parameters.top_k ?? 40}
            onChange={(e) => handleChange('top_k', parseInt(e.target.value) || 1)}
            step="1"
            min="1"
            max="100"
            className="w-16 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
          />
        </div>
        <input
          type="range"
          value={parameters.top_k ?? 40}
          onChange={(e) => handleChange('top_k', parseInt(e.target.value))}
          step="1"
          min="1"
          max="100"
          className="w-full"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Limits token selection to top K options
        </p>
      </div>

      {/* Repeat Penalty */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Repeat Penalty</label>
          <input
            type="number"
            value={parameters.repeat_penalty ?? 1.1}
            onChange={(e) => handleChange('repeat_penalty', parseFloat(e.target.value) || 1)}
            step="0.05"
            min="0"
            max="2"
            className="w-16 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
          />
        </div>
        <input
          type="range"
          value={parameters.repeat_penalty ?? 1.1}
          onChange={(e) => handleChange('repeat_penalty', parseFloat(e.target.value))}
          step="0.05"
          min="0"
          max="2"
          className="w-full"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Penalizes repetition. Higher = less repetitive
        </p>
      </div>

      {/* Advanced Options */}
      <details className="space-y-2">
        <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
          Advanced Options
        </summary>
        <div className="space-y-4 pt-2">
          {/* Seed */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Seed (optional)</label>
            <input
              type="number"
              value={parameters.seed ?? ''}
              onChange={(e) => handleChange('seed', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Random"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Set a seed for reproducible results
            </p>
          </div>

          {/* Context Window */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Context Window (optional)</label>
            <input
              type="number"
              value={parameters.num_ctx ?? ''}
              onChange={(e) => handleChange('num_ctx', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Model default"
              step="1024"
              min="512"
              max="131072"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Number of tokens to use for context (e.g., 4096, 8192)
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Tokens (optional)</label>
            <input
              type="number"
              value={parameters.num_predict ?? ''}
              onChange={(e) => handleChange('num_predict', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Unlimited"
              step="128"
              min="1"
              max="8192"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Maximum number of tokens to generate
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}
