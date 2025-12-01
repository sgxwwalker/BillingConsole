import { ref } from 'vue';

// Shared toast state
const toasts = ref([]);
let toastIdCounter = 0;

/**
 * Composable for toast notifications
 */
export function useToast() {
  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - 'success', 'error', 'warning', 'info'
   * @param {number} duration - How long to show the toast (ms), 0 for persistent
   * @returns {number} The toast ID
   */
  const showToast = (message, type = 'info', duration = 4000) => {
    const id = ++toastIdCounter;
    toasts.value.push({ id, message, type });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  /**
   * Remove a specific toast
   */
  const removeToast = (id) => {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  };

  /**
   * Clear all toasts
   */
  const clearAllToasts = () => {
    toasts.value = [];
  };

  return {
    toasts,
    showToast,
    removeToast,
    clearAllToasts
  };
}
