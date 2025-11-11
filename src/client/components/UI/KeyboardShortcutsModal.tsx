import { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

interface Shortcut {
  key: string;
  description: string;
  context?: string;
}

const shortcuts: Array<{ category: string; items: Shortcut[] }> = [
  {
    category: 'Global',
    items: [
      { key: 'Ctrl + K', description: 'Create new chat' },
      { key: 'Ctrl + B', description: 'Toggle sidebar' },
      { key: 'Ctrl + ,', description: 'Open settings' },
      { key: 'Ctrl + ?', description: 'Show this help' },
      { key: 'Escape', description: 'Close modals/dialogs' },
    ],
  },
  {
    category: 'Chat',
    items: [
      { key: 'Shift + Enter', description: 'New line in message', context: 'While typing' },
      { key: 'Enter', description: 'Send message', context: 'While typing' },
    ],
  },
  {
    category: 'Playground',
    items: [
      { key: 'Ctrl + Enter', description: 'Run comparison', context: 'In prompt input' },
    ],
  },
];

export function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-scale">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Close (Esc)"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div>
                      <div className="text-gray-900 dark:text-white font-medium">
                        {shortcut.description}
                      </div>
                      {shortcut.context && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {shortcut.context}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {shortcut.key.split(' + ').map((key, i, arr) => (
                        <div key={i} className="flex items-center gap-1">
                          <kbd className="px-3 py-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                            {key}
                          </kbd>
                          {i < arr.length - 1 && (
                            <span className="text-gray-400 dark:text-gray-500">+</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Footer Note */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 dark:text-blue-400 text-2xl">💡</div>
              <div>
                <div className="font-medium text-blue-900 dark:text-blue-200">
                  Pro Tip
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                  Press <kbd className="px-2 py-0.5 text-xs font-semibold bg-white dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded">Ctrl + ?</kbd> anytime to show this help again.
                </div>
              </div>
            </div>
          </div>

          {/* Platform Note */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            On macOS, use <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">⌘ Cmd</kbd> instead of <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Ctrl</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
