import { useState } from 'react';
import { Search } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useChats, useCreateChat, useDeleteChat } from '../../hooks/useChatsQuery';
import { SystemPromptModal } from '../SystemPrompts/SystemPromptModal';
import { ChatListSkeleton } from '../UI/Skeleton';
import { toastUtils } from '../../utils/toast';

interface SidebarProps {
  onOpenSettings?: () => void;
  defaultModel?: string;
  defaultSystemPromptId?: string | null;
  currentView?: 'chat' | 'collections' | 'logs' | 'models' | 'playground' | 'prompts';
  onViewChange?: (view: 'chat' | 'collections' | 'logs' | 'models' | 'playground' | 'prompts') => void;
}

export const Sidebar = ({
  onOpenSettings,
  defaultModel,
  defaultSystemPromptId,
  currentView = 'chat',
  onViewChange
}: SidebarProps) => {
  const { sidebarOpen, currentChatId, toggleSidebar, setCurrentChatId } = useChatStore();
  const { data: chats = [], isLoading: chatsLoading } = useChats();
  const createChatMutation = useCreateChat();
  const deleteChatMutation = useDeleteChat();
  const [showSystemPrompts, setShowSystemPrompts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleNewChat = async () => {
    if (!defaultModel) {
      toastUtils.error('No models available. Please make sure Ollama is running.');
      return;
    }

    try {
      // Use default model and system prompt from settings
      const newChat = await createChatMutation.mutateAsync({
        model: defaultModel,
        systemPromptId: defaultSystemPromptId || undefined,
      });
      setCurrentChatId(newChat.id);
    } catch (error) {
      console.error('Failed to create chat:', error);
      // Error toast already shown by mutation
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmed = await toastUtils.confirm(
      'Are you sure you want to delete this chat?',
      'Delete',
      'Cancel'
    );

    if (confirmed) {
      try {
        await deleteChatMutation.mutateAsync(chatId);
        // If we deleted the current chat, clear the selection
        if (chatId === currentChatId) {
          setCurrentChatId(null);
        }
      } catch (error) {
        console.error('Failed to delete chat:', error);
        // Error toast already shown by mutation
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (!sidebarOpen) return null;

  return (
    <>
      <aside className="w-80 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col animate-slide-in-left">
        {/* Header Section */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              Ollama UI Vibes
            </h1>
            <div className="flex items-center gap-1">
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Open settings"
                  title="Settings"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close sidebar"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        {onViewChange && (
          <div className="px-4 pt-4 pb-2">
            <div className="grid grid-cols-3 gap-1 p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
              <button
                onClick={() => onViewChange('chat')}
                className={`px-2 py-2 rounded-md text-xs font-medium transition-all ${
                  currentView === 'chat'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <span>Chats</span>
                </div>
              </button>
              <button
                onClick={() => onViewChange('playground')}
                className={`px-2 py-2 rounded-md text-xs font-medium transition-all ${
                  currentView === 'playground'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
                    />
                  </svg>
                  <span>Play</span>
                </div>
              </button>
              <button
                onClick={() => onViewChange('prompts')}
                className={`px-2 py-2 rounded-md text-xs font-medium transition-all ${
                  currentView === 'prompts'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>Prompts</span>
                </div>
              </button>
              <button
                onClick={() => onViewChange('collections')}
                className={`px-2 py-2 rounded-md text-xs font-medium transition-all ${
                  currentView === 'collections'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  <span>RAG</span>
                </div>
              </button>
              <button
                onClick={() => onViewChange('models')}
                className={`px-2 py-2 rounded-md text-xs font-medium transition-all ${
                  currentView === 'models'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                    />
                  </svg>
                  <span>Models</span>
                </div>
              </button>
              <button
                onClick={() => onViewChange('logs')}
                className={`px-2 py-2 rounded-md text-xs font-medium transition-all ${
                  currentView === 'logs'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>Logs</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons - Show only in chat view */}
        {currentView === 'chat' && (
          <div className="p-4 space-y-2">
            <button
              onClick={handleNewChat}
              disabled={createChatMutation.isPending}
              className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Chat
            </button>

            <button
              onClick={() => setShowSystemPrompts(true)}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors text-sm"
            >
              System Prompts
            </button>
          </div>
        )}

        {/* Search - Show only in chat view */}
        {currentView === 'chat' && chats.length > 0 && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Chat List - Show only in chat view */}
        {currentView === 'chat' && (
          <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
          <div className="space-y-1 pb-4">
            {chatsLoading ? (
              <ChatListSkeleton />
            ) : chats.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <div className="text-4xl opacity-50">💬</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  No chats yet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Click "New Chat" above to start a conversation
                </p>
              </div>
            ) : (() => {
              // Filter chats by search query
              const filteredChats = searchQuery
                ? chats.filter((c) =>
                    c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.model.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : chats;

              return filteredChats.length === 0 ? (
                <div className="p-6 text-center space-y-3">
                  <Search className="w-10 h-10 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    No chats found
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Try a different search term
                  </p>
                </div>
              ) : (
                filteredChats.map((chat, index) => (
                <div
                  key={chat.id}
                  className={`w-full p-3 rounded-lg transition-all group relative cursor-pointer animate-fade-in-up ${
                    currentChatId === chat.id
                      ? 'bg-primary-100 dark:bg-primary-900/30 border-l-4 border-primary-600'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setCurrentChatId(chat.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {chat.title || 'New Conversation'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {chat.model}
                      </div>
                      {chat.systemPrompt && (
                        <div className="text-xs text-primary-600 dark:text-primary-400 mt-1 truncate">
                          {chat.systemPrompt.name}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-400">
                        {formatDate(chat.updatedAt)}
                      </span>
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                        aria-label="Delete chat"
                      >
                        <svg
                          className="w-4 h-4 text-red-600 dark:text-red-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                ))
              );
            })()}
          </div>
          </div>
        )}

        {/* Collections View Placeholder */}
        {currentView === 'collections' && (
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Collections are managed in the main area</p>
            </div>
          </div>
        )}
      </aside>

      {showSystemPrompts && (
        <SystemPromptModal onClose={() => setShowSystemPrompts(false)} />
      )}
    </>
  );
};
