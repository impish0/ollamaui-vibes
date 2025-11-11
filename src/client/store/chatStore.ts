import { create } from 'zustand';
import type { Chat, Message, OllamaModel, Collection, ModelParameters } from '../../shared/types';

interface ChatStore {
  // State
  chats: Chat[];
  currentChatId: string | null;
  models: OllamaModel[];
  lastModelsFetch: number;
  isStreaming: boolean;
  streamingContent: string;
  darkMode: boolean;
  sidebarOpen: boolean;
  comparisonMode: boolean;
  comparisonChatId: string | null;

  // RAG State
  collections: Collection[];
  selectedCollectionIds: string[];
  ragEnabled: boolean;
  embeddingModels: OllamaModel[];

  // Model Parameters State
  currentParameters: ModelParameters;
  savedParameterPresets: Record<string, ModelParameters>;

  // Actions
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  deleteChat: (chatId: string) => void;
  setCurrentChatId: (chatId: string | null) => void;

  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, content: string) => void;

  setModels: (models: OllamaModel[], lastFetch: number) => void;

  setIsStreaming: (isStreaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  resetStreamingContent: () => void;

  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setComparisonMode: (enabled: boolean, chatId?: string) => void;

  // RAG Actions
  setCollections: (collections: Collection[]) => void;
  addCollection: (collection: Collection) => void;
  updateCollection: (collectionId: string, updates: Partial<Collection>) => void;
  deleteCollection: (collectionId: string) => void;
  setSelectedCollectionIds: (ids: string[]) => void;
  toggleCollectionSelection: (collectionId: string) => void;
  setRagEnabled: (enabled: boolean) => void;
  setEmbeddingModels: (models: OllamaModel[]) => void;

  // Model Parameters Actions
  setCurrentParameters: (parameters: ModelParameters) => void;
  updateCurrentParameters: (updates: Partial<ModelParameters>) => void;
  saveParameterPreset: (name: string, parameters: ModelParameters) => void;
  deleteParameterPreset: (name: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  // Initial state
  chats: [],
  currentChatId: null,
  models: [],
  lastModelsFetch: 0,
  isStreaming: false,
  streamingContent: '',
  darkMode: localStorage.getItem('darkMode') === 'true',
  sidebarOpen: true,
  comparisonMode: false,
  comparisonChatId: null,

  // RAG Initial State
  collections: [],
  selectedCollectionIds: [],
  ragEnabled: false,
  embeddingModels: [],

  // Model Parameters Initial State
  currentParameters: {
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
  },
  savedParameterPresets: {},

  // Actions
  setChats: (chats) => set({ chats }),

  addChat: (chat) => set((state) => ({
    chats: [chat, ...state.chats],
  })),

  updateChat: (chatId, updates) => set((state) => ({
    chats: state.chats.map((chat) =>
      chat.id === chatId ? { ...chat, ...updates } : chat
    ),
  })),

  deleteChat: (chatId) => set((state) => ({
    chats: state.chats.filter((chat) => chat.id !== chatId),
    currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
  })),

  setCurrentChatId: (chatId) => set({ currentChatId: chatId }),

  addMessage: (chatId, message) => set((state) => ({
    chats: state.chats.map((chat) =>
      chat.id === chatId
        ? {
            ...chat,
            messages: [...(chat.messages || []), message],
          }
        : chat
    ),
  })),

  updateMessage: (chatId, messageId, content) => set((state) => ({
    chats: state.chats.map((chat) =>
      chat.id === chatId
        ? {
            ...chat,
            messages: chat.messages?.map((msg) =>
              msg.id === messageId ? { ...msg, content } : msg
            ),
          }
        : chat
    ),
  })),

  setModels: (models, lastFetch) => set({ models, lastModelsFetch: lastFetch }),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  setStreamingContent: (content) => set({ streamingContent: content }),

  appendStreamingContent: (chunk) => set((state) => ({
    streamingContent: state.streamingContent + chunk,
  })),

  resetStreamingContent: () => set({ streamingContent: '' }),

  toggleDarkMode: () => set((state) => {
    const newDarkMode = !state.darkMode;
    localStorage.setItem('darkMode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { darkMode: newDarkMode };
  }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setComparisonMode: (enabled, chatId) => set({
    comparisonMode: enabled,
    comparisonChatId: enabled ? chatId || null : null,
  }),

  // RAG Actions
  setCollections: (collections) => set({ collections }),

  addCollection: (collection) => set((state) => ({
    collections: [collection, ...state.collections],
  })),

  updateCollection: (collectionId, updates) => set((state) => ({
    collections: state.collections.map((col) =>
      col.id === collectionId ? { ...col, ...updates } : col
    ),
  })),

  deleteCollection: (collectionId) => set((state) => ({
    collections: state.collections.filter((col) => col.id !== collectionId),
    selectedCollectionIds: state.selectedCollectionIds.filter((id) => id !== collectionId),
  })),

  setSelectedCollectionIds: (ids) => set({ selectedCollectionIds: ids }),

  toggleCollectionSelection: (collectionId) => set((state) => ({
    selectedCollectionIds: state.selectedCollectionIds.includes(collectionId)
      ? state.selectedCollectionIds.filter((id) => id !== collectionId)
      : [...state.selectedCollectionIds, collectionId],
  })),

  setRagEnabled: (enabled) => set({ ragEnabled: enabled }),

  setEmbeddingModels: (models) => set({ embeddingModels: models }),

  // Model Parameters Actions
  setCurrentParameters: (parameters) => set({ currentParameters: parameters }),

  updateCurrentParameters: (updates) => set((state) => ({
    currentParameters: { ...state.currentParameters, ...updates },
  })),

  saveParameterPreset: (name, parameters) => set((state) => ({
    savedParameterPresets: {
      ...state.savedParameterPresets,
      [name]: parameters,
    },
  })),

  deleteParameterPreset: (name) => set((state) => {
    const { [name]: _, ...rest } = state.savedParameterPresets;
    return { savedParameterPresets: rest };
  }),
}));
