"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { SessionUser } from "@/lib/data/entities";

const STORAGE_KEY = "ngekos…on";

/* ===== external store kecil (tanpa setState-in-effect) =====
   Sesi dibaca dari sessionStorage pada render klien pertama;
   server snapshot selalu null → tidak ada hydration mismatch. */

let session: SessionUser | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) session = JSON.parse(raw) as SessionUser;
  } catch {
    /* sesi rusak → abaikan */
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): SessionUser | null {
  if (typeof window === "undefined") return null;
  load();
  return session;
}

const getServerSnapshot = () => null;

function setSession(u: SessionUser | null) {
  session = u;
  loaded = true;
  try {
    if (u) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* mode privat → tetap in-memory */
  }
  for (const l of listeners) l();
}

interface SessionContextValue {
  user: SessionUser | null;
  /** false hanya saat hydrasi awal — gate login menunggu ini */
  ready: boolean;
  login: (user: SessionUser) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(
    subscribe,
    () => loaded,
    () => false
  );
  const login = useCallback((u: SessionUser) => setSession(u), []);
  const logout = useCallback(() => setSession(null), []);

  return (
    <SessionContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
