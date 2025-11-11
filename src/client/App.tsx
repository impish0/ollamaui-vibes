import { useEffect, lazy, Suspense, useMemo, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useChatStore } from './store/chatStore';
import { useChat, useCreateChat } from './hooks/useChatsQuery';
import { useCachedModels } from './hooks/useModelsQuery';
import { useSettings } from './hooks/useSettingsQuery';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { SettingsModal } from './components/Settings';
import { KeyboardShortcutsModal } from './components/UI/KeyboardShortcutsModal';
import { CollectionsPage } from './pages/Collections';
import { LogsPage } from './pages/Logs';
import { ModelsView } from './pages/ModelsView';
import { PlaygroundView } from './pages/PlaygroundView';
import { PromptsView } from './pages/PromptsView';
import { toastUtils } from './utils/toast';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load ChatWindow (loaded when user opens a chat)
const ChatWindow = lazy(() =>
  import('./components/Chat/ChatWindow').then((module) => ({
    default: module.ChatWindow,
  }))
);

// Loading fallback for ChatWindow
const ChatWindowLoading = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <span className="text-sm">Loading chat...</span>
    </div>
  </div>
);

function App() {
  const { currentChatId, setCurrentChatId } = useChatStore();
  const { data: currentChat } = useChat(currentChatId);
  const { data: settings } = useSettings();
  const createChatMutation = useCreateChat();
  const { data: modelsData } = useCachedModels();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'collections' | 'logs' | 'models' | 'playground' | 'prompts'>('chat');

  const models = modelsData?.models || [];

  // Get default model from settings or fallback to first available
  const defaultModel = useMemo(() => {
    if (settings?.model.defaultModel) {
      // Verify the default model still exists
      const modelExists = models.find(m => m.name === settings.model.defaultModel);
      if (modelExists) return settings.model.defaultModel;
    }
    return models[0]?.name || '';
  }, [settings?.model.defaultModel, models]);

  // Keyboard shortcuts
  const shortcuts = useMemo(
    () => [
      {
        key: 'k',
        ctrl: true,
        description: 'Create new chat',
        handler: async () => {
          if (!defaultModel) {
            toastUtils.error('No models available');
            return;
          }
          try {
            // Use default model from settings, and default system prompt if configured
            const newChat = await createChatMutation.mutateAsync({
              model: defaultModel,
              systemPromptId: settings?.model.defaultSystemPromptId || undefined,
            });
            setCurrentChatId(newChat.id);
          } catch (error) {
            console.error('Failed to create chat:', error);
          }
        },
      },
      {
        key: 'b',
        ctrl: true,
        description: 'Toggle sidebar',
        handler: () => {
          const store = useChatStore.getState();
          store.toggleSidebar();
        },
      },
      {
        key: ',',
        ctrl: true,
        description: 'Open settings',
        handler: () => setIsSettingsOpen(true),
      },
      {
        key: '?',
        ctrl: true,
        description: 'Show keyboard shortcuts',
        handler: () => setIsShortcutsOpen(true),
      },
    ],
    [defaultModel, settings?.model.defaultSystemPromptId, createChatMutation, setCurrentChatId]
  );

  useKeyboardShortcuts(shortcuts);

  // Apply theme from settings
  useEffect(() => {
    if (!settings) return;

    const applyTheme = () => {
      const theme = settings.ui.theme;

      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    applyTheme();

    // Listen for system theme changes if set to 'system'
    if (settings.ui.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [settings?.ui.theme]);

  return (
    <>
      <Toaster />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      {isShortcutsOpen && <KeyboardShortcutsModal onClose={() => setIsShortcutsOpen(false)} />}
      <div className="h-screen flex flex-col bg-white dark:bg-gray-950">
        <Header onOpenSettings={() => setIsSettingsOpen(true)} />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            onOpenSettings={() => setIsSettingsOpen(true)}
            defaultModel={defaultModel}
            defaultSystemPromptId={settings?.model.defaultSystemPromptId}
            currentView={currentView}
            onViewChange={setCurrentView}
          />
          <main className="flex-1 flex flex-col overflow-hidden">
            {currentView === 'logs' ? (
              <ErrorBoundary>
                <LogsPage />
              </ErrorBoundary>
            ) : currentView === 'collections' ? (
              <ErrorBoundary>
                <CollectionsPage />
              </ErrorBoundary>
            ) : currentView === 'models' ? (
              <ErrorBoundary>
                <ModelsView />
              </ErrorBoundary>
            ) : currentView === 'playground' ? (
              <ErrorBoundary>
                <PlaygroundView />
              </ErrorBoundary>
            ) : currentView === 'prompts' ? (
              <ErrorBoundary>
                <PromptsView />
              </ErrorBoundary>
            ) : currentChat ? (
              <ErrorBoundary>
                <Suspense fallback={<ChatWindowLoading />}>
                  <ChatWindow chat={currentChat} />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center space-y-4 p-8">
                  <div className="text-8xl mb-4">🚀</div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                    Welcome to Ollama UI Vibes
                  </h2>
                  <p className="text-lg max-w-md">
                    Create a new chat or select an existing one to get started with your local AI
                    models
                  </p>
                  <div className="pt-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Connected to Ollama</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

export default App;
