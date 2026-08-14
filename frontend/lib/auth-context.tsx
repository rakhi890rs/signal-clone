"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { wsClient } from "./websocket";
import type { UserOut } from "./types";

interface AuthContextValue {
  user: UserOut | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    phone_number?: string;
    display_name: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  updateUser: (u: UserOut) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("signal_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((u) => {
        setUser(u);
        wsClient.connect();
      })
      .catch(() => {
        localStorage.removeItem("signal_token");
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const res = await api.login(username, password);
    localStorage.setItem("signal_token", res.access_token);
    setUser(res.user);
    wsClient.connect();
    router.push("/chat");
  }

  async function register(data: {
    username: string;
    phone_number?: string;
    display_name: string;
    password: string;
  }) {
    const res = await api.register(data);
    localStorage.setItem("signal_token", res.access_token);
    setUser(res.user);
    wsClient.connect();
    router.push("/chat");
  }

  function logout() {
    localStorage.removeItem("signal_token");
    wsClient.disconnect();
    setUser(null);
    router.push("/login");
  }

  function updateUser(u: UserOut) {
    setUser(u);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
