import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

/**
 * Holds authentication state (user + token) and exposes login/register/logout.
 * The JWT is persisted to localStorage so sessions survive page reloads.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, if we have a token, fetch the current user.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.data.user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    const { user: u, token } = res.data.data;
    localStorage.setItem("token", token);
    setUser(u);
    return u;
  }

  async function register(name, email, password) {
    const res = await api.post("/auth/register", { name, email, password });
    const { user: u, token } = res.data.data;
    localStorage.setItem("token", token);
    setUser(u);
    return u;
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, login, register, logout, isAdmin: user?.role === "admin" }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
