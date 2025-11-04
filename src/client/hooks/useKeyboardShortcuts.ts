import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean; // Cmd on Mac
  shift?: boolean;
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
  description?: string;
}

/**
 * Hook for managing keyboard shortcuts
 * Supports Ctrl/Cmd modifiers for cross-platform compatibility
 */
export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const metaMatches = shortcut.meta ? e.metaKey : true;
        const shiftMatches = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatches = shortcut.alt ? e.altKey : !e.altKey;

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
          // Don't trigger if user is typing in an input/textarea
          const target = e.target as HTMLElement;
          if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
          ) {
            // Allow Escape even in inputs (to unfocus)
            if (e.key === 'Escape') {
              e.preventDefault();
              shortcut.handler(e);
            }
            continue;
          }

          e.preventDefault();
          shortcut.handler(e);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

/**
 * Get platform-specific modifier key name
 */
export const getModifierKey = () => {
  return navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl';
};
