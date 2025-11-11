import { QueryClient } from '@tanstack/react-query';

/**
 * React Query configuration
 * Optimized for a local AI interface with:
 * - Longer stale times (data changes infrequently)
 * - Automatic background refetching
 * - Optimistic updates support
 * - Error retry with exponential backoff
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,

      // Cache data for 10 minutes
      gcTime: 10 * 60 * 1000,

      // Refetch on window focus (user comes back to tab)
      refetchOnWindowFocus: true,

      // Refetch on reconnect
      refetchOnReconnect: true,

      // Don't refetch on mount if data is fresh
      refetchOnMount: false,

      // Retry failed requests
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error) {
          const statusMatch = error.message.match(/status:?\s*(\d{3})/i);
          if (statusMatch) {
            const status = parseInt(statusMatch[1]);
            if (status >= 400 && status < 500) {
              return false; // Don't retry client errors
            }
          }
        }

        // Retry up to 3 times for other errors
        return failureCount < 3;
      },

      // Exponential backoff for retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations once
      retry: 1,

      // Exponential backoff for mutation retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

/**
 * Query keys for different resources
 * Using arrays allows for hierarchical invalidation
 */
export const queryKeys = {
  chats: {
    all: ['chats'] as const,
    detail: (id: string) => ['chats', id] as const,
    messages: (id: string) => ['chats', id, 'messages'] as const,
  },
  models: {
    all: ['models'] as const,
    cached: ['models', 'cached'] as const,
  },
  ollama: {
    health: ['ollama', 'health'] as const,
    config: ['ollama', 'config'] as const,
  },
  settings: {
    all: ['settings'] as const,
    detail: (category: string, key: string) => ['settings', category, key] as const,
  },
} as const;
