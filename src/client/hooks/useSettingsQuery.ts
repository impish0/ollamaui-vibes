import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../services/api';
import { queryKeys } from '../lib/react-query';
import type { AppSettings } from '../../shared/settings';
import { showToast } from '../utils/toast';

/**
 * React Query hooks for app settings
 * Provides type-safe access to configurable settings with caching
 */

/**
 * Fetch all settings
 */
export const useSettings = () => {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => settingsApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes (settings don't change frequently)
    refetchOnMount: false, // Don't refetch unless explicitly invalidated
  });
};

/**
 * Update multiple settings at once
 */
export const useUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<AppSettings>) => settingsApi.update(updates),
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.settings.all });

      // Snapshot previous value
      const previousSettings = queryClient.getQueryData<AppSettings>(queryKeys.settings.all);

      // Optimistically update
      if (previousSettings) {
        queryClient.setQueryData<AppSettings>(queryKeys.settings.all, {
          ...previousSettings,
          ...updates,
          // Deep merge for nested objects
          titleGeneration: { ...previousSettings.titleGeneration, ...updates.titleGeneration },
          model: { ...previousSettings.model, ...updates.model },
          ui: { ...previousSettings.ui, ...updates.ui },
          general: { ...previousSettings.general, ...updates.general },
          advanced: { ...previousSettings.advanced, ...updates.advanced },
        });
      }

      return { previousSettings };
    },
    onSuccess: () => {
      showToast.success('Settings updated successfully');
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(queryKeys.settings.all, context.previousSettings);
      }
      showToast.error(`Failed to update settings: ${error.message}`);
    },
    onSettled: () => {
      // Always refetch after mutation completes
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
};

/**
 * Update a single setting by path
 */
export const useUpdateSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ category, key, value }: { category: string; key: string; value: any }) =>
      settingsApi.updateSetting(category, key, value),
    onSuccess: (updatedSettings) => {
      // Update cache with new settings
      queryClient.setQueryData(queryKeys.settings.all, updatedSettings);
      showToast.success('Setting updated');
    },
    onError: (error: Error) => {
      showToast.error(`Failed to update setting: ${error.message}`);
    },
  });
};

/**
 * Reset all settings to defaults
 */
export const useResetSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => settingsApi.reset(),
    onSuccess: (defaultSettings) => {
      queryClient.setQueryData(queryKeys.settings.all, defaultSettings);
      showToast.success('Settings reset to defaults');
    },
    onError: (error: Error) => {
      showToast.error(`Failed to reset settings: ${error.message}`);
    },
  });
};

/**
 * Reset a specific category to defaults
 */
export const useResetCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (category: keyof AppSettings) => settingsApi.resetCategory(category),
    onSuccess: (updatedSettings, category) => {
      queryClient.setQueryData(queryKeys.settings.all, updatedSettings);
      showToast.success(`${category} settings reset to defaults`);
    },
    onError: (error: Error) => {
      showToast.error(`Failed to reset category: ${error.message}`);
    },
  });
};
