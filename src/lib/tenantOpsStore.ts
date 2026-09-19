"use client";

/* ===== store operasi tenant - tagihan lunas + pengaduan baru =====
   Pola external-store sessionStorage (sama dgn adminOpsStore):
   /tenant/bills menandai lunas, /tenant/complaints menulis pengaduan baru,
   /dashboard + /tenant/dashboard membacanya agar status berubah lintas halaman. */

import { useSyncExternalStore } from "react";
import { seedComplaints, type Complaint, type ComplaintStatus } from "@/lib/data/userData";

const STORAGE_KEY = "ngekos.tenant-ops";

export interface TenantOpsState {
  /** id invoice yang dilunasi sesi ini */
  paidInvoiceIds: string[];
  /** pengaduan dibuat sesi ini */
  complaints: Complaint[];
}

const EMPTY: TenantOpsState = { paidInvoiceIds: [], complaints: [] };

let state: TenantOpsState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TenantOpsState>;
      state = {
        paidInvoiceIds: Array.isArray(parsed.paidInvoiceIds) ? parsed.paidInvoiceIds : [],
        complaints: Array.isArray(parsed.complaints) ? parsed.complaints : [],
      };
    }
  } catch {
    /* abaikan */
  }
  recompute();
}

/** snapshot HARUS stabil: derived dihitung ulang hanya saat state berubah */
let snapshotAll: Complaint[] = [...seedComplaints];

function recompute() {
  snapshotAll = [...state.complaints, ...seedComplaints];
}

function persist() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* in-memory */
  }
  recompute();
}

function emit() {
  for (const l of listeners) l();
}

export function markInvoicePaid(id: string) {
  load();
  if (state.paidInvoiceIds.includes(id)) return;
  state = { ...state, paidInvoiceIds: [...state.paidInvoiceIds, id] };
  persist();
  emit();
}

export function addComplaint(input: {
  title: string;
  category: Complaint["category"];
  room: string;
  reporter: string;
  propertySlug: string;
  propertyName: string;
  at: string;
}) {
  load();
  const c: Complaint = {
    id: `CP-${Math.floor(1000 + Math.random() * 9000)}`,
    reporter: input.reporter,
    propertySlug: input.propertySlug,
    propertyName: input.propertyName,
    room: input.room,
    title: input.title,
    category: input.category,
    status: "open",
    at: input.at,
    updatedAt: input.at,
    noteId: "Menunggu respons pemilik.",
    noteEn: "Waiting for the owner to respond.",
  };
  state = { ...state, complaints: [c, ...state.complaints] };
  persist();
  emit();
  return c;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): TenantOpsState {
  load();
  return state;
}

const getServerSnapshot = () => EMPTY;

export function useTenantOps(): TenantOpsState {
  load();
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function getComplaints(): Complaint[] {
  load();
  return snapshotAll;
}

const getServerComplaints = () => snapshotAll;

export function useTenantComplaints(): Complaint[] {
  return useSyncExternalStore(subscribe, getComplaints, getServerComplaints);
}

/** label warna status pengaduan → StatusBadge color */
export const COMPLAINT_COLOR: Record<ComplaintStatus, "gray" | "blue" | "yellow" | "green"> = {
  open: "yellow",
  acknowledged: "blue",
  in_progress: "blue",
  resolved: "green",
  closed: "gray",
};
