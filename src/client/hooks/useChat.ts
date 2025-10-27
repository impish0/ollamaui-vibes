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

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const fetchedChats = await chatsApi.getAll();
      setChats(fetchedChats);
    } catch (error) {
      console.error('Failed to load chats:', error);
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

  const sendMessage = async (chatId: string, message: string, model: string) => {
    try {
      setIsStreaming(true);
      resetStreamingContent();

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
      for await (const chunk of ollamaApi.streamChat(chatId, model, message)) {
        if (chunk.content) {
          appendStreamingContent(chunk.content);
        }
        if (chunk.done && chunk.messageId) {
          // Streaming complete, reload chat to get all messages with proper IDs
          const updatedChat = await chatsApi.getById(chatId);
          updateChat(chatId, updatedChat);
          resetStreamingContent();
          setIsStreaming(false);
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
  };
};
