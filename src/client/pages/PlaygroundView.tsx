import { useState, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { useCachedModels } from '../hooks/useModelsQuery';
import { useSystemPrompts } from '../hooks/useSystemPromptsQuery';
import { ModelParameters } from '../components/ModelParameters';
import { ResponseAnalyzer } from '../components/Playground/ResponseAnalyzer';
import {
  Play, Plus, X, Copy, Download, RotateCcw, Settings2,
  Zap, Clock, Activity, CheckCircle2, AlertCircle, BarChart3
} from 'lucide-react';
import type { ModelParameters as ModelParametersType } from '@shared/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ModelSlot {
  id: string;
  modelName: string | null;
  parameters: ModelParametersType;
  response: string;
  isStreaming: boolean;
  error: string | null;
  metrics: {
    totalTime?: number;
    timeToFirstToken?: number;
    tokenCount?: number;
    tokensPerSecond?: number;
  } | null;
}

export function PlaygroundView() {
  const { currentParameters } = useChatStore();
  const { data: modelsData } = useCachedModels();
  const { data: systemPrompts = [] } = useSystemPrompts();
  const models = modelsData?.models || [];

  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedSystemPromptId, setSelectedSystemPromptId] = useState<string>('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Initialize with 2 model slots
  const [modelSlots, setModelSlots] = useState<ModelSlot[]>([
    {
      id: '1',
      modelName: models[0]?.name || null,
      parameters: { ...currentParameters },
      response: '',
      isStreaming: false,
      error: null,
      metrics: null,
    },
    {
      id: '2',
      modelName: models[1]?.name || models[0]?.name || null,
      parameters: { ...currentParameters },
      response: '',
      isStreaming: false,
      error: null,
      metrics: null,
    },
  ]);

  const addModelSlot = () => {
    if (modelSlots.length >= 4) return;

    setModelSlots([
      ...modelSlots,
      {
        id: String(Date.now()),
        modelName: models[0]?.name || null,
        parameters: { ...currentParameters },
        response: '',
        isStreaming: false,
        error: null,
        metrics: null,
      },
    ]);
  };

  const removeModelSlot = (id: string) => {
    if (modelSlots.length <= 1) return;
    setModelSlots(modelSlots.filter((slot) => slot.id !== id));
  };

  const updateModelSlot = (id: string, updates: Partial<ModelSlot>) => {
    setModelSlots((slots) =>
      slots.map((slot) => (slot.id === id ? { ...slot, ...updates } : slot))
    );
  };

  // Handle system prompt selection
  const handleSystemPromptChange = (promptId: string) => {
    setSelectedSystemPromptId(promptId);
    if (promptId) {
      const selectedPrompt = systemPrompts.find((p) => p.id === promptId);
      if (selectedPrompt) {
        setSystemPrompt(selectedPrompt.content);
      }
    } else {
      setSystemPrompt('');
    }
  };

  const runComparison = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    const activeModels = modelSlots.filter((slot) => slot.modelName);
    if (activeModels.length === 0) {
      alert('Please select at least one model');
      return;
    }

    // Reset all responses
    setModelSlots((slots) =>
      slots.map((slot) => ({
        ...slot,
        response: '',
        error: null,
        metrics: null,
        isStreaming: true,
      }))
    );

    setIsRunning(true);

    try {
      // Prepare request payload
      const payload = {
        prompt,
        systemPrompt: showSystemPrompt ? systemPrompt : undefined,
        models: activeModels.map((slot) => ({
          name: slot.modelName!,
          parameters: slot.parameters,
        })),
      };

      // Use EventSource for streaming
      const url = '/api/playground/compare/stream';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to start comparison');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim().startsWith('data:'));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.substring(5));

            if (data.type === 'chunk') {
              updateModelSlot(
                modelSlots.find((s) => s.modelName === data.model)?.id || '',
                {
                  response: data.fullContent,
                }
              );
            } else if (data.type === 'model_complete') {
              updateModelSlot(
                modelSlots.find((s) => s.modelName === data.model)?.id || '',
                {
                  response: data.fullContent,
                  isStreaming: false,
                  metrics: data.metrics,
                }
              );
            } else if (data.type === 'model_error') {
              updateModelSlot(
                modelSlots.find((s) => s.modelName === data.model)?.id || '',
                {
                  error: data.error,
                  isStreaming: false,
                }
              );
            } else if (data.type === 'complete') {
              setIsRunning(false);
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', line);
          }
        }
      }
    } catch (error) {
      console.error('Comparison error:', error);
      alert('Failed to run comparison: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setModelSlots((slots) =>
        slots.map((slot) => ({
          ...slot,
          isStreaming: false,
        }))
      );
    } finally {
      setIsRunning(false);
    }
  };

  const stopComparison = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsRunning(false);
    setModelSlots((slots) =>
      slots.map((slot) => ({ ...slot, isStreaming: false }))
    );
  };

  const resetAll = () => {
    setPrompt('');
    setSystemPrompt('');
    setModelSlots((slots) =>
      slots.map((slot) => ({
        ...slot,
        response: '',
        error: null,
        metrics: null,
        isStreaming: false,
      }))
    );
  };

  const copyResponse = (response: string) => {
    navigator.clipboard.writeText(response);
  };

  const exportResults = () => {
    const results = modelSlots.map((slot) => ({
      model: slot.modelName,
      parameters: slot.parameters,
      response: slot.response,
      metrics: slot.metrics,
      error: slot.error,
    }));

    const exportData = {
      prompt,
      systemPrompt: showSystemPrompt ? systemPrompt : undefined,
      results,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playground-comparison-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="text-3xl">🎮</span>
              Multi-Model Playground
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Compare up to 4 models side-by-side with real-time streaming
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAnalyzer(!showAnalyzer)}
              disabled={modelSlots.filter((s) => s.response).length < 2}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              <BarChart3 className="w-4 h-4" />
              {showAnalyzer ? 'Hide' : 'Analyze'}
            </button>
            <button
              onClick={addModelSlot}
              disabled={modelSlots.length >= 4}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Model ({modelSlots.length}/4)
            </button>
            <button
              onClick={resetAll}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={exportResults}
              disabled={!modelSlots.some((s) => s.response)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Model Slots Grid or Analyzer */}
      {showAnalyzer ? (
        <div className="flex-1 overflow-hidden">
          <ResponseAnalyzer
            responses={modelSlots
              .filter((s) => s.response && s.modelName)
              .map((s) => ({
                model: s.modelName!,
                response: s.response,
                speed: s.metrics?.totalTime || 0,
                tokens: s.metrics?.tokenCount || 0,
                cost: 0, // Ollama is free, will calculate for API providers later
                qualityScore: 0, // Calculated in analyzer
              }))}
            onClose={() => setShowAnalyzer(false)}
          />
        </div>
      ) : (
        <div className={`flex-1 overflow-y-auto p-6 grid gap-6 ${
          modelSlots.length === 1
            ? 'grid-cols-1'
            : modelSlots.length === 2
            ? 'grid-cols-2'
            : modelSlots.length === 3
            ? 'grid-cols-3'
            : 'grid-cols-2'
        }`}>
          {modelSlots.map((slot) => (
            <ModelSlotCard
              key={slot.id}
              slot={slot}
              models={models}
              onUpdate={(updates) => updateModelSlot(slot.id, updates)}
              onRemove={() => removeModelSlot(slot.id)}
              canRemove={modelSlots.length > 1}
              onCopy={() => copyResponse(slot.response)}
            />
          ))}
        </div>
      )}

      {/* Prompt Input (Bottom) */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-6xl mx-auto space-y-3">
          {/* System Prompt Toggle */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {modelSlots.filter((s) => s.modelName).length} model{modelSlots.filter((s) => s.modelName).length !== 1 ? 's' : ''} selected
            </div>
            <button
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showSystemPrompt ? '− Hide' : '+ Add'} System Prompt
            </button>
          </div>

          {/* System Prompt Section */}
          {showSystemPrompt && (
            <div className="space-y-2">
              {/* System Prompt Selector */}
              <select
                value={selectedSystemPromptId}
                onChange={(e) => handleSystemPromptChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Custom System Prompt</option>
                {systemPrompts.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>

              {/* System Prompt Content */}
              <textarea
                value={systemPrompt}
                onChange={(e) => {
                  setSystemPrompt(e.target.value);
                  setSelectedSystemPromptId(''); // Clear selection when manually editing
                }}
                placeholder="Enter custom system prompt or select one above"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
              />
            </div>
          )}

          {/* Prompt Input & Run Button */}
          <div className="flex gap-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isRunning) {
                  runComparison();
                }
              }}
              placeholder="Enter your prompt here... (Ctrl+Enter to run)"
              className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
            {isRunning ? (
              <button
                onClick={stopComparison}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 self-end"
              >
                <X className="w-5 h-5" />
                Stop
              </button>
            ) : (
              <button
                onClick={runComparison}
                disabled={!prompt.trim() || !modelSlots.some((s) => s.modelName)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center gap-2 self-end"
              >
                <Play className="w-5 h-5" />
                Run
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ModelSlotCardProps {
  slot: ModelSlot;
  models: any[];
  onUpdate: (updates: Partial<ModelSlot>) => void;
  onRemove: () => void;
  canRemove: boolean;
  onCopy: () => void;
}

function ModelSlotCard({ slot, models, onUpdate, onRemove, canRemove, onCopy }: ModelSlotCardProps) {
  const [showParams, setShowParams] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex items-center justify-between">
          <select
            value={slot.modelName || ''}
            onChange={(e) => onUpdate({ modelName: e.target.value })}
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select model...</option>
            {models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setShowParams(!showParams)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Parameters"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            {canRemove && (
              <button
                onClick={onRemove}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Parameters */}
        {showParams && (
          <div className="mt-2">
            <ModelParameters
              parameters={slot.parameters}
              onChange={(params) => onUpdate({ parameters: params })}
              compact={true}
            />
          </div>
        )}

        {/* Metrics */}
        {slot.metrics && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{slot.metrics.totalTime}ms</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Zap className="w-3 h-3" />
              <span>{slot.metrics.tokensPerSecond} t/s</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Activity className="w-3 h-3" />
              <span>TTFT: {slot.metrics.timeToFirstToken}ms</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>{slot.metrics.tokenCount} tokens</span>
            </div>
          </div>
        )}

        {/* Status */}
        {slot.isStreaming && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" />
            Streaming...
          </div>
        )}
        {slot.error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            {slot.error}
          </div>
        )}
      </div>

      {/* Response */}
      <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
        {slot.response ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {slot.response}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm">Response will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {slot.response && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCopy}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-full justify-center"
          >
            <Copy className="w-4 h-4" />
            Copy Response
          </button>
        </div>
      )}
    </div>
  );
}
