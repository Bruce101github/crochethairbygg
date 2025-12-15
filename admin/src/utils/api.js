// Centralized API utility with automatic token refresh

let isRefreshing = false;
let refreshPromise = null;

/**
 * Refreshes the access token using the refresh token
 */
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("admin_refresh");
  
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  try {
    const res = await fetch("http://127.0.0.1:8000/api/token/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!res.ok) {
      // Refresh token is invalid or expired
      localStorage.removeItem("admin_access");
      localStorage.removeItem("admin_refresh");
      throw new Error("Refresh token expired");
    }

    const data = await res.json();
    localStorage.setItem("admin_access", data.access);
    
    // If a new refresh token is provided, update it
    if (data.refresh) {
      localStorage.setItem("admin_refresh", data.refresh);
    }

    return data.access;
  } catch (error) {
    localStorage.removeItem("admin_access");
    localStorage.removeItem("admin_refresh");
    throw error;
  }
}

/**
 * Makes an authenticated API request with automatic token refresh
 * @param {string} url - The API endpoint URL
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Response>} - The fetch response
 */
export async function authenticatedFetch(url, options = {}) {
  let accessToken = localStorage.getItem("admin_access");

  // If no token, throw error
  if (!accessToken) {
    throw new Error("No access token available");
  }

  // Check if body is FormData
  const isFormData = options.body instanceof FormData;
  
  // Make the initial request
  // For FormData, don't set Content-Type (browser will set it with boundary)
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
  };
  
  if (!isFormData && !options.headers?.["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If token expired (401), try to refresh
  if (response.status === 401) {
    // Prevent multiple simultaneous refresh attempts
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
    }

    try {
      // Wait for token refresh
      accessToken = await refreshPromise;
      
      // Retry the original request with new token
      const retryHeaders = {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      };
      
      if (!isFormData && !options.headers?.["Content-Type"]) {
        retryHeaders["Content-Type"] = "application/json";
      }

      response = await fetch(url, {
        ...options,
        headers: retryHeaders,
      });
    } catch (refreshError) {
      // Refresh failed, redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      throw refreshError;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }

  return response;
}

/**
 * Gets the current access token, refreshing if needed
 */
export async function getAccessToken() {
  let accessToken = localStorage.getItem("admin_access");
  
  if (!accessToken) {
    throw new Error("No access token available");
  }

  return accessToken;
}

