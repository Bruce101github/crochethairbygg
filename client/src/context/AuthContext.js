"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });
  const [refreshToken, setRefreshToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refresh");
    }
    return null;
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Save tokens helper
  const saveTokens = (access, refresh) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);
    }
    setAccessToken(access);
    setRefreshToken(refresh);
  };

  // Remove tokens helper
  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
    }
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  // Auto-refresh token
  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (res.ok) {
        const data = await res.json();
        saveTokens(data.access, refreshToken);
        return true;
      } else {
        logout();
        return false;
      }
    } catch {
      logout();
      return false;
    }
  }, [refreshToken]);

  // Fetch user info from API
  const fetchUser = useCallback(async () => {
    if (!accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else if (res.status === 401) {
        // Token expired, try to refresh
        if (refreshToken) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            // Retry fetching user after refresh
            const retryRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/`, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("access")}`,
              },
            });
            if (retryRes.ok) {
              const userData = await retryRes.json();
              setUser(userData);
            }
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken, refreshAccessToken]);

  useEffect(() => {
    if (accessToken !== null) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [accessToken, fetchUser]);


  // Refresh every 4 minutes
  useEffect(() => {
    if (!refreshToken) return;

    const interval = setInterval(() => {
      refreshAccessToken();
    }, 4 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshToken, refreshAccessToken]);

  // Login function
  const login = async (username, password) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      saveTokens(data.access, data.refresh);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, accessToken, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}