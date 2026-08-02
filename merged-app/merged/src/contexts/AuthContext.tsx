/**
 * AuthContext.tsx
 * Provides auth state (user, token) throughout the app.
 * Login / logout / signup mutate both localStorage and this context.
 */

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import * as authService from "../lib/authService";
import type { User } from "../lib/authService";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (payload: Parameters<typeof authService.signup>[0]) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await authService.login(email, password);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      }
      return { success: res.success ?? false, message: res.message };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      return { success: false, message };
    }
  }, []);

  const signup = useCallback(async (payload: Parameters<typeof authService.signup>[0]) => {
    try {
      const res = await authService.signup(payload);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      }
      return { success: res.success ?? false, message: res.message };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Signup failed";
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
