"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { SessionUser } from "@/lib/data/entities";
import { createClient } from "@/lib/supabase/client";

type ApiProfile = {
  id: string;
  email: string;
  fullName: string;
  role: "SEEKER" | "OWNER" | "ADMIN";
};

interface SessionContextValue {
  user: SessionUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  loginWithGoogle: (role: "seeker" | "owner") => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<SessionUser | null>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

let currentUser: SessionUser | null = null;
let isReady = false;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getUserSnapshot(): SessionUser | null {
  return currentUser;
}

function getReadySnapshot(): boolean {
  return isReady;
}

const getServerUserSnapshot = () => null;
const getServerReadySnapshot = () => false;

function toSessionUser(profile: ApiProfile): SessionUser {
  return {
    role: profile.role.toLowerCase() as SessionUser["role"],
    name: profile.fullName,
    email: profile.email,
  };
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) throw new Error(body?.error?.message ?? "Permintaan gagal");
  return body.data;
}

async function fetchCurrentProfile(): Promise<SessionUser | null> {
  const response = await fetch("/api/me", { cache: "no-store" });
  if (response.status === 401) {
    currentUser = null;
    isReady = true;
    emitChange();
    return null;
  }
  const profile = (await readJson(response)) as ApiProfile;
  const next = toSessionUser(profile);
  currentUser = next;
  isReady = true;
  emitChange();
  return next;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, getUserSnapshot, getServerUserSnapshot);
  const ready = useSyncExternalStore(subscribe, getReadySnapshot, getServerReadySnapshot);

  useEffect(() => {
    let active = true;
    fetchCurrentProfile()
      .catch(() => {
        if (active) {
          currentUser = null;
          isReady = true;
          emitChange();
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    return fetchCurrentProfile();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    await readJson(response);
    const profile = await fetchCurrentProfile();
    if (!profile) throw new Error("Sesi tidak dapat dibuat");
    return profile;
  }, []);

  const loginWithGoogle = useCallback(async (role: "seeker" | "owner") => {
    const supabase = createClient();
    const locale = location.pathname.split("/")[1] === "en" ? "en" : "id";
    const redirectTo = `${location.origin}/auth/callback?role=${role}&next=/${locale}/${role === "owner" ? "owner" : "dashboard"}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    currentUser = null;
    isReady = true;
    emitChange();
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, loginWithGoogle, logout, refresh }),
    [user, ready, login, loginWithGoogle, logout, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
