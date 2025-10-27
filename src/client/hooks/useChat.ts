import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { chatsApi, ollamaApi } from '../services/api';

export const useChat = () => {
  const {
    chats,
    currentChatId,
    isStreaming,
    streamingContent,
    setChats,
    addChat,
    updateChat,
    deleteChat: deleteFromStore,
    setCurrentChatId,
    addMessage,
    setIsStreaming,
    appendStreamingContent,
    resetStreamingContent,
  } = useChatStore();

  // Load chats on mount and restore from URL
  useEffect(() => {
    loadChats().then(() => {
      // After chats are loaded, check URL for chat ID
      const chatIdFromUrl = getChatIdFromUrl();
      if (chatIdFromUrl) {
        setCurrentChatId(chatIdFromUrl);
      }
    });

    // Listen for URL hash changes (browser back/forward)
    const handleHashChange = () => {
      const chatIdFromUrl = getChatIdFromUrl();
      if (chatIdFromUrl && chatIdFromUrl !== currentChatId) {
        setCurrentChatId(chatIdFromUrl);
      } else if (!chatIdFromUrl && currentChatId) {
        setCurrentChatId(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Load full chat with all messages when currentChatId changes
  useEffect(() => {
    if (currentChatId) {
      loadFullChat(currentChatId);
      // Update URL to reflect current chat
      updateUrlForChat(currentChatId);
    } else {
      // Clear URL hash if no chat is selected
      if (window.location.hash) {
        window.history.pushState(null, '', window.location.pathname);
      }
    }
  }, [currentChatId]);

  const getChatIdFromUrl = (): string | null => {
    const hash = window.location.hash;
    const match = hash.match(/^#\/chat\/(.+)$/);
    return match ? match[1] : null;
  };

  const updateUrlForChat = (chatId: string) => {
    const newHash = `#/chat/${chatId}`;
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  };

  const loadChats = async () => {
    try {
      const fetchedChats = await chatsApi.getAll();
      setChats(fetchedChats);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const loadFullChat = async (chatId: string) => {
    try {
      const fullChat = await chatsApi.getById(chatId);
      updateChat(chatId, fullChat);
    } catch (error) {
      console.error('Failed to load full chat:', error);
    }
  };

  const createChat = async (model: string, systemPromptId?: string) => {
    try {
      const newChat = await chatsApi.create({ model, systemPromptId });
      addChat(newChat);
      setCurrentChatId(newChat.id);
      return newChat;
    } catch (error) {
      console.error('Failed to create chat:', error);
      throw error;
    }
  };

  const updateChatData = async (chatId: string, updates: { title?: string; model?: string; systemPromptId?: string }) => {
    try {
      const updated = await chatsApi.update(chatId, updates);
      updateChat(chatId, updated);
    } catch (error) {
      console.error('Failed to update chat:', error);
      throw error;
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      await chatsApi.delete(chatId);
      deleteFromStore(chatId);
    } catch (error) {
      console.error('Failed to delete chat:', error);
      throw error;
    }
  };

  let abortController: AbortController | null = null;

  const sendMessage = async (chatId: string, message: string, model: string) => {
    try {
      setIsStreaming(true);
      resetStreamingContent();
      abortController = new AbortController();

      // Add user message to UI
      const userMessage = {
        id: `temp-${Date.now()}`,
        chatId,
        role: 'user' as const,
        content: message,
        model: null,
        createdAt: new Date().toISOString(),
      };
      addMessage(chatId, userMessage);

      // Stream response from Ollama
      for await (const chunk of ollamaApi.streamChat(chatId, model, message, { signal: abortController.signal })) {
        if (chunk.content) {
          appendStreamingContent(chunk.content);
        }
        if (chunk.done && chunk.messageId) {
          // Streaming complete, reload chat to get all messages with proper IDs
          const updatedChat = await chatsApi.getById(chatId);
          updateChat(chatId, updatedChat);
          resetStreamingContent();
          setIsStreaming(false);
          abortController = null;
        }
        if (chunk.error) {
          console.error('Stream error:', chunk.error);
          setIsStreaming(false);
          resetStreamingContent();
          throw new Error(chunk.error);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsStreaming(false);
      resetStreamingContent();
      throw error;
    }
  };

  const stopStreaming = () => {
    try {
      abortController?.abort();
    } catch {}
  };

  const currentChat = chats.find((chat) => chat.id === currentChatId);

  return {
    chats,
    currentChat,
    currentChatId,
    isStreaming,
    streamingContent,
    loadChats,
    createChat,
    updateChat: updateChatData,
    deleteChat,
    setCurrentChatId,
    sendMessage,
    stopStreaming,
  };
};
