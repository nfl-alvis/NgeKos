"use client";

/* ===== store aktivitas user — favorit, pembayaran booking, ulasan =====
   External-store sessionStorage (pola adminOpsStore). Aksi dari /dashboard
   dan turunannya ditulis ke sini; snapshot derived stabil (recompute hanya
   saat setState/load — bukan di selector) agar aman untuk useSyncExternalStore. */

import { useSyncExternalStore } from "react";
import { favoriteSlugsSeed, seedUserPayments, seedUserReviews, type BookingPayment, type UserReview } from "@/lib/data/userData";
import { pushActivity } from "@/lib/userActivityStore";

const STORAGE_KEY = "ngekos.user-ops";

interface PersistedState {
  favorites: string[] | null;
  /** id pembayaran yang berubah status karena aksi sesi */
  paymentOverrides: Record<string, BookingPayment["status"]>;
  /** transaksi pembayaran baru yang dibuat sesi ini (booking tanpa seed bayar) */
  addedPayments: BookingPayment[];
  /** ulasan baru/suntingan sesi ini (id → review) */
  reviewEdits: Record<string, UserReview>;
  removedReviewIds: string[];
}

const EMPTY: PersistedState = {
  favorites: null,
  paymentOverrides: {},
  addedPayments: [],
  reviewEdits: {},
  removedReviewIds: [],
};

let state: PersistedState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

/* ===== derived snapshot (stabil) ===== */
interface Derived {
  favorites: string[];
  payments: BookingPayment[];
  reviews: UserReview[];
}

function computeDerived(s: PersistedState): Derived {
  const payments = [
    ...s.addedPayments,
    ...seedUserPayments.map((p) =>
      s.paymentOverrides[p.id] ? { ...p, status: s.paymentOverrides[p.id] } : p
    ),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const reviews = [
    ...Object.values(s.reviewEdits),
    ...seedUserReviews.filter((r) => !s.removedReviewIds.includes(r.id) && !s.reviewEdits[r.id]),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return { favorites: s.favorites ?? favoriteSlugsSeed, payments, reviews };
}

let derived: Derived = computeDerived(EMPTY);

function apply(next: PersistedState) {
  state = next;
  derived = computeDerived(state);
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* mode privat → in-memory */
  }
  for (const l of listeners) l();
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      derived = computeDerived({ ...EMPTY, ...parsed });
      state = { ...EMPTY, ...parsed };
    }
  } catch {
    /* abaikan */
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Derived {
  load();
  return derived;
}

const getServerSnapshot = () => derived;

export function useUserOps(): Derived {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ===== aksi ===== */

export function toggleFavorite(slug: string) {
  load();
  const current = state.favorites ?? favoriteSlugsSeed;
  const has = current.includes(slug);
  apply({ ...state, favorites: has ? current.filter((s) => s !== slug) : [slug, ...current] });
  return !has;
}

/**
 * tandai pembayaran booking berhasil (simulasi hasil Midtrans).
 * Kalau transaksi booking belum ada di seed → tambahkan sebagai record baru.
 */
export function markPaymentPaid(paymentId: string, propertyName: string, amount = 0) {
  load();
  if (state.paymentOverrides[paymentId] === "paid") return;
  if (!seedUserPayments.some((p) => p.id === paymentId) && !state.addedPayments.some((p) => p.id === paymentId)) {
    const bookingId = paymentId.replace(/^PAY-/, "BK-");
    state = {
      ...state,
      addedPayments: [
        { id: paymentId, bookingId, propertyName, amount, status: "paid", at: new Date().toISOString() },
        ...state.addedPayments,
      ],
    };
  } else {
    state = { ...state, paymentOverrides: { ...state.paymentOverrides, [paymentId]: "paid" } };
  }
  apply(state);
  pushActivity({
    type: "payment",
    titleId: "Pembayaran berhasil",
    titleEn: "Payment successful",
    subject: propertyName,
    at: new Date().toISOString(),
  });
}

export function saveReview(review: UserReview) {
  load();
  apply({ ...state, reviewEdits: { ...state.reviewEdits, [review.id]: review } });
  pushActivity({
    type: "review",
    titleId: "Ulasan dikirim",
    titleEn: "Review submitted",
    subject: review.propertyName,
    at: new Date().toISOString(),
  });
}
