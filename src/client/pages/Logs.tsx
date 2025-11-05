import { useState, useEffect } from 'react';
import { toastUtils } from '../utils/toast';

interface PromptLog {
  id: string;
  chatId: string | null;
  model: string;
  messages: string; // JSON string
  ragContext: string | null;
  collectionIds: string | null;
  estimatedTokens: number;
  contextWindowSize: number;
  responseTokens: number | null;
  response: string | null;
  responseTime: number | null;
  error: string | null;
  userMessage: string;
  createdAt: string;
}

export function LogsPage() {
  const [logs, setLogs] = useState<PromptLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<PromptLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filter]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/logs?limit=50');
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();

      let filtered = data.logs;
      if (filter === 'error') {
        filtered = filtered.filter((log: PromptLog) => log.error);
      } else if (filter === 'success') {
        filtered = filtered.filter((log: PromptLog) => !log.error);
      }

      setLogs(filtered);
    } catch (error) {
      toastUtils.error('Failed to load logs');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/logs/stats/summary');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatTokens = (tokens: number) => {
    if (tokens > 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-white dark:bg-gray-950">
      {/* Logs List */}
      <div className="w-96 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>📊</span>
            <span>Prompt Logs</span>
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Inspect what's sent to models
          </p>

          {/* Stats */}
          {stats && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <div className="text-gray-600 dark:text-gray-400">Total Requests</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.totalLogs}
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <div className="text-gray-600 dark:text-gray-400">Avg Response</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {Math.round(stats.avgResponseTime)}ms
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <div className="text-gray-600 dark:text-gray-400">Input Tokens</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatTokens(stats.totalInputTokens)}
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <div className="text-gray-600 dark:text-gray-400">Output Tokens</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatTokens(stats.totalOutputTokens)}
                </div>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-3 py-1 text-xs rounded ${
                filter === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Success
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-3 py-1 text-xs rounded ${
                filter === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Errors
            </button>
          </div>
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <p>No logs yet</p>
              <p className="text-xs mt-1">Send some messages to see logs</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedLog?.id === log.id
                      ? 'bg-primary-100 dark:bg-primary-900/30 border-l-4 border-primary-600'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {log.userMessage}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                        <span className="truncate">{log.model}</span>
                        <span>•</span>
                        <span>{formatTokens(log.estimatedTokens)} → {log.responseTokens ? formatTokens(log.responseTokens) : '?'}</span>
                      </div>
                      {log.collectionIds && (
                        <div className="mt-1 text-xs text-primary-600 dark:text-primary-400">
                          📚 RAG enabled
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs">
                      <span className="text-gray-500 dark:text-gray-500">
                        {formatDate(log.createdAt)}
                      </span>
                      {log.error ? (
                        <span className="text-red-600 dark:text-red-400">❌</span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">✓</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Details */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedLog ? (
          <>
            {/* Details Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Request Details
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {formatDate(selectedLog.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-2 mt-4 text-xs">
                <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                  <div className="text-gray-600 dark:text-gray-400">Model</div>
                  <div className="font-mono text-sm text-gray-900 dark:text-white truncate">
                    {selectedLog.model}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                  <div className="text-gray-600 dark:text-gray-400">Input Tokens</div>
                  <div className="font-mono text-sm text-gray-900 dark:text-white">
                    {formatTokens(selectedLog.estimatedTokens)}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                  <div className="text-gray-600 dark:text-gray-400">Output Tokens</div>
                  <div className="font-mono text-sm text-gray-900 dark:text-white">
                    {selectedLog.responseTokens ? formatTokens(selectedLog.responseTokens) : 'N/A'}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                  <div className="text-gray-600 dark:text-gray-400">Response Time</div>
                  <div className="font-mono text-sm text-gray-900 dark:text-white">
                    {selectedLog.responseTime ? `${selectedLog.responseTime}ms` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Details Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Error */}
              {selectedLog.error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
                    ❌ Error
                  </h3>
                  <pre className="text-xs text-red-800 dark:text-red-300 whitespace-pre-wrap font-mono">
                    {selectedLog.error}
                  </pre>
                </div>
              )}

              {/* RAG Context */}
              {selectedLog.ragContext && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-2 flex items-center gap-2">
                    <span>📚</span>
                    <span>RAG Context Injected</span>
                  </h3>
                  <pre className="text-xs text-purple-800 dark:text-purple-300 whitespace-pre-wrap font-mono bg-white dark:bg-gray-800 p-3 rounded border border-purple-200 dark:border-purple-700 max-h-96 overflow-y-auto">
                    {selectedLog.ragContext}
                  </pre>
                </div>
              )}

              {/* Full Prompt */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                  <span>📝</span>
                  <span>Full Prompt (Messages Array)</span>
                </h3>
                <pre className="text-xs text-blue-800 dark:text-blue-300 whitespace-pre-wrap font-mono bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700 max-h-96 overflow-y-auto">
                  {selectedLog.messages}
                </pre>
              </div>

              {/* Response */}
              {selectedLog.response && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2 flex items-center gap-2">
                    <span>✅</span>
                    <span>Model Response</span>
                  </h3>
                  <pre className="text-xs text-green-800 dark:text-green-300 whitespace-pre-wrap font-mono bg-white dark:bg-gray-800 p-3 rounded border border-green-200 dark:border-green-700 max-h-96 overflow-y-auto">
                    {selectedLog.response}
                  </pre>
                </div>
              )}

              {/* Technical Details */}
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-3">
                  Technical Details
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Log ID:</span>
                    <span className="text-gray-900 dark:text-white">{selectedLog.id}</span>
                  </div>
                  {selectedLog.chatId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Chat ID:</span>
                      <span className="text-gray-900 dark:text-white">{selectedLog.chatId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Context Window:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatTokens(selectedLog.contextWindowSize)} tokens
                    </span>
                  </div>
                  {selectedLog.collectionIds && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Collections:</span>
                      <span className="text-gray-900 dark:text-white">
                        {JSON.parse(selectedLog.collectionIds).length} selected
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">👈</div>
              <p>Select a log to inspect</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
