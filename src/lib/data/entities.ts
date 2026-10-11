import type {
  Booking,
  Tenant,
  Invoice,
  NotificationItem,
  Conversation,
  SubscriptionPlan,
  SubscriptionState,
  OwnerProfile,
  AdminReviewEntry,
  RentalAgreement,
  RoomType,
} from "./types";

/* ===== session (dummy auth, tanpa backend) ===== */

export type Role = "seeker" | "owner" | "admin";

export interface SessionUser {
  role: Role;
  name: string;
  email: string;
}

/* Owner demo: Ratri Wulandari */
export const OWNER_PROFILE: OwnerProfile = {
  name: "Ratri Wulandari",
  email: "ratri.wulandari@gmail.com",
  avatarSeed: "ratri-wulandari",
  joinedAt: "2025-02-11",
};

export const ADMIN_PROFILE: SessionUser = {
  role: "admin",
  name: "Bayu Pratama",
  email: "admin@ngekost.id",
};

/** daftar email admin terdaftar - login admin selain ini ditolak */
export const ADMIN_ALLOWED_EMAILS = [
  "admin@ngekost.id",
  "bayu.pratama@ngekost.id",
  "operator@ngekost.id",
];

export const OWNER_DEMO_ACCOUNT = {
  email: "owner@ngekost.id",
  password: "Password123!",
  name: "Ratri Wulandari",
};

export const ADMIN_DEMO_ACCOUNT = {
  email: "admin@ngekost.id",
  password: "Password123!",
  name: "Bayu Pratama",
};

/**
 * Akun demo pencari kos (tempmail sungguhan - dibuat via api.mail.tm,
 * inbox bisa diakses untuk uji alur notifikasi). Dipakai tombol
 * "Gunakan akun demo" di modal login alur pengajuan sewa.
 */
export const SEEKER_DEMO_ACCOUNT = {
  email: "ngekostygocrudemo@uberip.com",
  password: "NgekostDemo#2026",
  name: "Budi Santoso",
};

/* ===== properti milik owner (subset dari properties.ts) ===== */

export const OWNER_PROPERTY_SLUGS = [
  "kost-dparagon-ijen-nirwana",
  "kost-bougenville-summbersari",
];

/* ===== booking (Halaman 6, 7, 11) ===== */

export const bookings: Booking[] = [];

/* booking masuk ke owner - terpisah dari booking penyewa demo */
export const ownerBookings: Booking[] = [];

/* ===== tenant (Halaman 12) ===== */

export const tenants: Tenant[] = [];

export const rentalAgreements: RentalAgreement[] = [];

/* ===== invoice (Halaman 13) ===== */

export const invoices: Invoice[] = [];

/* ===== notifikasi (Halaman 14) ===== */

export const notifications: NotificationItem[] = [];

/* ===== pesan (Halaman 15) ===== */

export const conversations: Conversation[] = [];

export const messageTemplates = [
  { id: "tpl-1", label: "Pengingat pembayaran", body: "Halo, kami ingatkan bahwa tagihan bulan ini sudah terbit. Mohon selesaikan pembayaran sebelum tanggal 5 ya. Terima kasih." },
  { id: "tpl-2", label: "Konfirmasi booking diterima", body: "Halo, booking kamu sudah disetujui. Silakan lanjut ke halaman pembayaran sebelum batas waktu 24 jam." },
  { id: "tpl-3", label: "Info kunjungan teknisi", body: "Halo, kunjungan teknisi dijadwalkan besok pagi pukul 09.00. Mohon pastikan kamar bisa diakses ya." },
];

/* ===== langganan (Halaman 16) ===== */

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    pricePerMonth: 99000,
    maxProperties: 3,
    maxRooms: 15,
    advancedAnalytics: false,
    autoMessages: false,
  },
  {
    id: "professional",
    name: "Professional",
    pricePerMonth: 249000,
    maxProperties: 10,
    maxRooms: 60,
    advancedAnalytics: true,
    autoMessages: true,
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    pricePerMonth: 599000,
    maxProperties: 0, // unlimited
    maxRooms: 0,
    advancedAnalytics: true,
    autoMessages: true,
  },
];

export const subscriptionState: SubscriptionState = {
  status: "trial",
  trialDaysLeft: 12,
  trialDaysTotal: 30,
  activeUntil: "2026-09-14",
  planId: "professional",
};

/* ===== admin: antrian & riwayat verifikasi (Halaman 19, 20) ===== */

export const verificationQueue: AdminReviewEntry[] = [];

export const verificationHistory: AdminReviewEntry[] = [];

/* ===== ulasan penyewa untuk widget rating dashboard owner ===== */

export interface OwnerReview {
  id: string;
  authorName: string;
  propertySlug: string;
  rating: number;
  /** ISO date */
  at: string;
  bodyId: string;
  bodyEn: string;
}

export const ownerReviews: OwnerReview[] = [];

/* ===== room grid untuk Halaman 10 (dummy per property slug) ===== */

export interface RoomUnit {
  number: string;
  status: "kosong" | "terisi" | "maintenance" | "dipesan";
}

export const roomUnits: Record<string, RoomUnit[]> = {};

export function getOwnerProperties(): PropertyLike[] {
  const found: (PropertyLike | undefined)[] = OWNER_PROPERTY_SLUGS.map((slug) =>
    allProps.find((p) => p.slug === slug)
  );
  return found.filter((p): p is PropertyLike => p !== undefined);
}

/* helper type supaya file ini tidak circular-import properties.ts */
type PropertyLike = {
  slug: string;
  name: string;
  city: string;
  district: string;
  address: string;
  imageSeed: string;
  verificationStatus: "verified" | "pending" | "rejected";
  verificationNote?: string;
  roomTypes: RoomType[];
};

import { properties as allProps } from "./properties";
