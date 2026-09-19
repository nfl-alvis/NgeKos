"use client";

/* ===== antrian verifikasi admin - satu-satunya sumber kebenaran keputusan =====
   Halaman /admin/verification menulis keputusan ke sini (sessionStorage, pola
   sama dengan SessionProvider); /admin/verification/history membacanya sehingga
   approve/reject hari ini langsung muncul di riwayat dengan alasan tersimpan.
   Data statis verificationQueue/verificationHistory hanya jadi seed. */

import { useSyncExternalStore } from "react";
import type { AdminReviewEntry } from "@/lib/data/types";
import { verificationHistory, verificationQueue } from "@/lib/data/entities";

const STORAGE_KEY = "ngekos.admin-verifications";

export interface DecisionRecord {
  id: string;
  decision: "approved" | "rejected";
  /** ISO timestamp keputusan */
  decidedAt: string;
  decidedBy: string;
  rejectionReason?: string;
}

interface PersistedState {
  /** id antrian yang sudah diputuskan sesi ini */
  decisions: Record<string, DecisionRecord>;
  /** snapshot field properti saat diajukan - modal review riwayat membacanya
      supaya data tetap lengkap walau entri hilang dari seed */
  snapshots: Record<string, AdminReviewEntry>;
}

export interface AdminReviewData {
  queue: AdminReviewEntry[];
  history: AdminReviewEntry[];
}

const INITIAL: PersistedState = { decisions: {}, snapshots: {} };

/** snapshot server = data seed statis (sama dgn render RSC → tanpa hydration mismatch) */
const SEED_DATA: AdminReviewData = {
  queue: verificationQueue,
  history: [...verificationHistory].sort((a, b) =>
    (b.decidedAt ?? "").localeCompare(a.decidedAt ?? "")
  ),
};

let persisted: PersistedState = INITIAL;
let derived: AdminReviewData = SEED_DATA;
let loaded = false;
const listeners = new Set<() => void>();

function derive(s: PersistedState): AdminReviewData {
  if (Object.keys(s.decisions).length === 0) return SEED_DATA;
  const decidedIds = new Set(Object.keys(s.decisions));
  const queue = verificationQueue.filter((p) => !decidedIds.has(p.id));

  // keputusan sesi ini → baris riwayat terbaru di depan
  const sessionRows = Object.values(s.decisions)
    .map((d): AdminReviewEntry | null => {
      const seed =
        s.snapshots[d.id] ?? verificationQueue.find((p) => p.id === d.id);
      if (!seed) return null;
      return {
        ...seed,
        decidedAt: d.decidedAt,
        decidedBy: d.decidedBy,
        decision: d.decision,
        rejectionReason: d.rejectionReason,
      };
    })
    .filter((x): x is AdminReviewEntry => x !== null)
    .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));

  return { queue, history: [...sessionRows, ...SEED_DATA.history] };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      persisted = {
        decisions: parsed.decisions ?? {},
        snapshots: parsed.snapshots ?? {},
      };
      derived = derive(persisted);
    }
  } catch {
    /* data rusak → abaikan, mulai dari seed statis */
  }
}

function setState(next: PersistedState) {
  persisted = next;
  derived = derive(persisted);
  loaded = true;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    /* mode privat → tetap in-memory */
  }
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): AdminReviewData {
  load();
  return derived;
}

const getServerSnapshot = () => SEED_DATA;

/**
 * Catat keputusan admin untuk satu entri antrian.
 * Snapshot entry disimpan agar riwayat tetap punya data properti lengkap
 * meskipun entri hilang dari antrian setelah verifikasi.
 */
export function recordDecision(
  entry: AdminReviewEntry,
  decision: "approved" | "rejected",
  decidedBy: string,
  rejectionReason?: string
) {
  if (entry.id) {
    fetch(`/api/admin/verifications/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision: decision === "approved" ? "APPROVED" : "REJECTED",
        ...(decision === "rejected" ? { reason: rejectionReason || "Tidak memenuhi kelayakan properti" } : {}),
      }),
    }).catch(() => {});
  }

  setState({
    decisions: {
      ...persisted.decisions,
      [entry.id]: {
        id: entry.id,
        decision,
        decidedAt: new Date().toISOString(),
        decidedBy,
        rejectionReason: decision === "rejected" ? rejectionReason : undefined,
      },
    },
    snapshots: { ...persisted.snapshots, [entry.id]: entry },
  });
}

/** Reaktif: queue tanpa entri terputus + history dengan keputusan sesi di depan. */
export function useAdminReviewData(): AdminReviewData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Tanggal ISO (yyyy-mm-dd / timestamp) → locale-aware. */
export function formatReviewDate(iso: string, locale: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}T/.test(iso) ? iso : `${iso}T00:00:00Z`);
  return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Umur antrian dalam hari penuh (dibulatkan ke bawah, min 0). */
export function ageInDays(isoDate: string, now: Date = new Date()): number {
  const then = new Date(`${isoDate}T00:00:00`);
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000));
}
