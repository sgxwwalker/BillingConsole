import { ref } from 'vue';

const API_BASE_URL = 'http://localhost:4000';

/**
 * Composable for API calls
 */
export function useApi() {
  const loading = ref(false);
  const error = ref(null);

  /**
   * Get auth headers
   */
  const getAuthHeaders = () => {
    const token = localStorage.getItem('sgx_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  /**
   * Generic API fetch with error handling
   */
  const apiFetch = async (endpoint, options = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: getAuthHeaders(),
        ...options
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * GET request
   */
  const get = (endpoint) => apiFetch(endpoint);

  /**
   * POST request
   */
  const post = (endpoint, body) => apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body)
  });

  /**
   * PUT request
   */
  const put = (endpoint, body) => apiFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body)
  });

  /**
   * DELETE request
   */
  const del = (endpoint) => apiFetch(endpoint, {
    method: 'DELETE'
  });

  /**
   * PATCH request
   */
  const patch = (endpoint, body) => apiFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });

  return {
    loading,
    error,
    get,
    post,
    put,
    del,
    patch,
    API_BASE_URL
  };
}
