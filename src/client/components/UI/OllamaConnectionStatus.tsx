import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';

type ConnectionStatus = 'connected' | 'disconnected' | 'checking' | 'warning';

interface OllamaConnectionStatusProps {
  compact?: boolean;
}

export function OllamaConnectionStatus({ compact = false }: OllamaConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const checkConnection = async () => {
    try {
      setStatus('checking');
      const response = await fetch('/api/ollama/health', {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      const data = await response.json();
      setLastCheck(new Date());

      if (response.ok && data.healthy) {
        setStatus('connected');
        setErrorMessage(null);
      } else {
        setStatus('disconnected');
        setErrorMessage(data.error || 'Ollama is not responding');
      }
    } catch (error) {
      setStatus('disconnected');
      setLastCheck(new Date());
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setErrorMessage('Connection timeout - Ollama took too long to respond');
        } else {
          setErrorMessage(`Cannot connect to Ollama: ${error.message}`);
        }
      } else {
        setErrorMessage('Cannot connect to Ollama');
      }
    }
  };

  // Check on mount and every 15 seconds
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  if (compact) {
    return (
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="relative group"
        title={status === 'connected' ? 'Ollama connected' : errorMessage || 'Checking Ollama...'}
      >
        {status === 'checking' && (
          <Loader className="w-4 h-4 text-gray-400 animate-spin" />
        )}
        {status === 'connected' && (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
        {status === 'disconnected' && (
          <XCircle className="w-4 h-4 text-red-500" />
        )}
        {status === 'warning' && (
          <AlertCircle className="w-4 h-4 text-yellow-500" />
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          status === 'connected'
            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            : status === 'disconnected'
            ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            : status === 'checking'
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
        }`}
      >
        {status === 'checking' && (
          <>
            <Loader className="w-3 h-3 animate-spin" />
            <span>Checking...</span>
          </>
        )}
        {status === 'connected' && (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Ollama Connected</span>
          </>
        )}
        {status === 'disconnected' && (
          <>
            <XCircle className="w-3 h-3" />
            <span>Ollama Disconnected</span>
          </>
        )}
        {status === 'warning' && (
          <>
            <AlertCircle className="w-3 h-3" />
            <span>Connection Issues</span>
          </>
        )}
      </button>

      {/* Details Dropdown */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-4">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Connection Status
              </h3>
              <p className={`text-sm ${
                status === 'connected'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {status === 'connected' ? '✓ Connected' : '✗ Disconnected'}
              </p>
            </div>

            {lastCheck && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last checked: {lastCheck.toLocaleTimeString()}
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-xs text-red-700 dark:text-red-400">
                  {errorMessage}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  checkConnection();
                  setShowDetails(false);
                }}
                disabled={status === 'checking'}
                className="w-full px-3 py-2 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {status === 'checking' ? 'Checking...' : 'Test Connection Now'}
              </button>
            </div>

            {status === 'disconnected' && (
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p className="font-medium">Troubleshooting:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Is Ollama running? Try <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">ollama serve</code></li>
                  <li>Check Settings → Ollama URL</li>
                  <li>Default: http://localhost:11434</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDetails && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}

// Banner version for full-width warnings
interface OllamaDisconnectedBannerProps {
  onDismiss?: () => void;
}

export function OllamaDisconnectedBanner({ onDismiss }: OllamaDisconnectedBannerProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Ollama is not connected
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
              Start Ollama to use AI features: <code className="px-1 py-0.5 bg-red-100 dark:bg-red-900/40 rounded">ollama serve</code>
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
