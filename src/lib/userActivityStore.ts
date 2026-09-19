"use client";

/* ===== aktivitas user (pencari kos) - seed statis + entri sesi =====
   Pola external-store sessionStorage sama seperti adminReviewStore:
   tulis dari dialog (bayar, ulasan, favorit), baca di dashboard & halaman
   aktivitas supaya riwayat bertambah tanpa backend. */

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "ngekos.user-activity";

export type ActivityType =
  | "booking"
  | "payment"
  | "favorite"
  | "review"
  | "status"
  | "refund"
  | "info";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  /** copy terjemahan Indonesia - dipakai langsung sebagai label */
  titleId: string;
  titleEn: string;
  /** nama objek terkait (kos / booking) */
  subject: string;
  /** ISO timestamp */
  at: string;
}

/** tanggal booking demo dibuat → seed riwayat sinkron dengan entities.bookings */
export const seedActivity: ActivityItem[] = [
  { id: "sa-1", type: "favorite", titleId: "Ditambahkan ke favorit", titleEn: "Added to favorites", subject: "Kost Putri Mawar", at: "2026-09-02T19:40:00" },
  { id: "sa-2", type: "review", titleId: "Ulasan dikirim", titleEn: "Review submitted", subject: "Kost Bougenville", at: "2026-09-01T14:05:00" },
  { id: "sa-3", type: "status", titleId: "Booking menunggu konfirmasi pemilik", titleEn: "Booking awaiting owner confirmation", subject: "Kost Kenanga", at: "2026-08-31T08:40:00" },
  { id: "sa-4", type: "payment", titleId: "Pembayaran pertama berhasil", titleEn: "First payment successful", subject: "Kost Bougenville", at: "2026-08-15T09:05:00" },
  { id: "sa-5", type: "booking", titleId: "Booking dibuat", titleEn: "Booking created", subject: "Kost Griya Cemara", at: "2026-08-12T09:14:00" },
  { id: "sa-6", type: "refund", titleId: "Refund diajukan", titleEn: "Refund requested", subject: "Kost Pangeran Diponegoro", at: "2026-08-05T11:02:00" },
  { id: "sa-7", type: "info", titleId: "Pengingat jatuh tempo disetel", titleEn: "Due-date reminder set", subject: "Kost Griya Cemara", at: "2026-07-28T20:10:00" },
];

const sorted = <T extends { at: string }>(rows: T[]) =>
  [...rows].sort((a, b) => b.at.localeCompare(a.at));

let extra: ActivityItem[] = [];
let loaded = false;
const listeners = new Set<() => void>();

let derived: ActivityItem[] = sorted(seedActivity);

function rebuild() {
  derived = sorted([...extra, ...seedActivity]);
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ActivityItem[];
      if (Array.isArray(parsed)) {
        extra = parsed;
        rebuild();
      }
    }
  } catch {
    /* data sesi rusak → abaikan, pakai seed */
  }
}

function persist() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(extra));
  } catch {
    /* mode privat → tetap in-memory */
  }
}

function emit() {
  for (const l of listeners) l();
}

/** tambah entri aktivitas baru (dipanggil dari aksi dialog) */
export function pushActivity(item: Omit<ActivityItem, "id">) {
  load();
  extra = [{ ...item, id: `act-${Date.now()}-${extra.length}` }, ...extra];
  rebuild();
  persist();
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): ActivityItem[] {
  load();
  return derived;
}

const getServerSnapshot = () => derived;

export function useUserActivity(): ActivityItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** kunci i18n relatif: today / yesterday / daysAgo / weeksAgo / monthsAgo */
export function timeAgoKey(at: string, now: Date): { key: string; count?: number } {
  const days = Math.floor((now.getTime() - new Date(at).getTime()) / 86_400_000);
  if (days <= 0) return { key: "today" };
  if (days === 1) return { key: "yesterday" };
  if (days < 7) return { key: "daysAgo", count: days };
  if (days < 30) return { key: "weeksAgo", count: Math.floor(days / 7) };
  return { key: "monthsAgo", count: Math.floor(days / 30) };
}
