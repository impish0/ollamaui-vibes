import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { useChatStore } from './store/chatStore';
import { useChat } from './hooks/useChat';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';

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
  const { darkMode } = useChatStore();
  const { currentChat } = useChat();

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <>
      <Toaster />
      <div className="h-screen flex flex-col bg-white dark:bg-gray-950">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden">
            {currentChat ? (
              <Suspense fallback={<ChatWindowLoading />}>
                <ChatWindow chat={currentChat} />
              </Suspense>
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
