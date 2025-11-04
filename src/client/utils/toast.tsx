import toast from 'react-hot-toast';

/**
 * Centralized toast notification utilities
 * Provides consistent styling and behavior across the app
 */

export const toastUtils = {
  /**
   * Show a success message
   */
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'bottom-right',
      style: {
        background: '#10b981',
        color: '#fff',
        borderRadius: '0.5rem',
        padding: '1rem',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#10b981',
      },
    });
  },

  /**
   * Show an error message
   */
  error: (message: string) => {
    toast.error(message, {
      duration: 4000,
      position: 'bottom-right',
      style: {
        background: '#ef4444',
        color: '#fff',
        borderRadius: '0.5rem',
        padding: '1rem',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#ef4444',
      },
    });
  },

  /**
   * Show an info message
   */
  info: (message: string) => {
    toast(message, {
      duration: 3000,
      position: 'bottom-right',
      icon: 'ℹ️',
      style: {
        background: '#3b82f6',
        color: '#fff',
        borderRadius: '0.5rem',
        padding: '1rem',
      },
    });
  },

  /**
   * Show a warning message
   */
  warning: (message: string) => {
    toast(message, {
      duration: 3500,
      position: 'bottom-right',
      icon: '⚠️',
      style: {
        background: '#f59e0b',
        color: '#fff',
        borderRadius: '0.5rem',
        padding: '1rem',
      },
    });
  },

  /**
   * Show a loading toast and return its ID for later dismissal
   */
  loading: (message: string) => {
    return toast.loading(message, {
      position: 'bottom-right',
      style: {
        background: '#6b7280',
        color: '#fff',
        borderRadius: '0.5rem',
        padding: '1rem',
      },
    });
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (toastId: string) => {
    toast.dismiss(toastId);
  },

  /**
   * Show a confirmation dialog (async)
   * Returns true if user confirms, false if cancelled
   */
  confirm: async (message: string, confirmText = 'Confirm', cancelText = 'Cancel'): Promise<boolean> => {
    return new Promise((resolve) => {
      toast(
        (t) => (
          <div className="flex flex-col gap-3">
            <p className="font-medium">{message}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(false);
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(true);
                }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {confirmText}
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity,
          position: 'top-center',
          style: {
            background: '#fff',
            color: '#111',
            borderRadius: '0.5rem',
            padding: '1rem',
            minWidth: '350px',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          },
        }
      );
    });
  },

  /**
   * Show a promise-based toast
   * Updates automatically based on promise state
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ): Promise<T> => {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        position: 'bottom-right',
        style: {
          borderRadius: '0.5rem',
          padding: '1rem',
        },
      }
    );
  },
};
