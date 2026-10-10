import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  type AuthUser
} from "../api/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, displayName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then((currentUser) => {
        if (mounted) setUser(currentUser);
      })
      .catch((requestError: unknown) => {
        if (!mounted) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          setUser(null);
        } else {
          setError(requestError instanceof Error ? requestError.message : "Unable to verify your session.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    error,
    async login(email, password) {
      setError("");
      setUser(await loginUser(email, password));
    },
    async register(email, displayName, password) {
      setError("");
      setUser(await registerUser(email, displayName, password));
    },
    async logout() {
      await logoutUser();
      setUser(null);
    }
  }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
