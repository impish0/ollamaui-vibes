import { useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useChats, useCreateChat, useDeleteChat } from '../../hooks/useChatsQuery';
import { useCachedModels } from '../../hooks/useModelsQuery';
import { SystemPromptModal } from '../SystemPrompts/SystemPromptModal';
import { ChatListSkeleton } from '../UI/Skeleton';
import { toastUtils } from '../../utils/toast';

interface SidebarProps {
  onOpenSettings?: () => void;
}

export const Sidebar = ({ onOpenSettings }: SidebarProps) => {
  const { sidebarOpen, currentChatId, darkMode, toggleDarkMode, toggleSidebar, setCurrentChatId } = useChatStore();
  const { data: chats = [], isLoading: chatsLoading } = useChats();
  const { data: modelsData } = useCachedModels();
  const createChatMutation = useCreateChat();
  const deleteChatMutation = useDeleteChat();
  const [showSystemPrompts, setShowSystemPrompts] = useState(false);

  const models = modelsData?.models || [];

  const handleNewChat = async () => {
    if (models.length === 0) {
      toastUtils.error('No models available. Please make sure Ollama is running.');
      return;
    }

    try {
      const newChat = await createChatMutation.mutateAsync({ model: models[0].name });
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
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
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
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
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
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>
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

        {/* Action Buttons */}
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
            ) : (
              chats.map((chat, index) => (
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
            )}
          </div>
        </div>
      </aside>

      {showSystemPrompts && (
        <SystemPromptModal onClose={() => setShowSystemPrompts(false)} />
      )}
    </>
  );
};
