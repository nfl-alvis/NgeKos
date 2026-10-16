/**
 * Dataset domain "user biasa" (pencari/penyewa) + detail tenancy tenant demo.
 * Dipakai bersama oleh /dashboard (aktivitas mencari kos) dan
 * /tenant/* (aktivitas tinggal di kos) - lihat rencana pemisahan dashboard.
 */

import type { Facility } from "./types";

/* ===== akun demo ===== */

/** email sesi demo → identitas tenant aktif (tenants t-1) */
export const DEMO_USER_EMAIL = "imade.sudiarta@gmail.com";
export const DEMO_USER_NAME = "I made Sudiarta";

/** tanggal "sekarang" versi demo - konstan supaya copy relatif tidak bergeser */
export const DEMO_TODAY = new Date("2026-09-03T12:00:00");

/* ===== ulasan milik user ===== */

export interface UserReview {
  id: string;
  propertySlug: string;
  propertyName: string;
  authorName: string;
  /** ulasan milik akun demo (tampil di "Review Saya") */
  mine: boolean;
  rating: number;
  /** ISO date */
  at: string;
  /** ulasan masih bisa disunting selama belum dibalas owner */
  editable: boolean;
  bodyId: string;
  bodyEn: string;
}

import {
  ENABLE_TENANT_DUMMIES,
  dummyComplaints,
  dummyAnnouncements,
  dummyUserPayments,
  dummyUserReviews,
} from "./tenantDummies";

export const seedUserReviews: UserReview[] = ENABLE_TENANT_DUMMIES ? [...dummyUserReviews] : [];

/** kos yang pernah ditinggali user → bisa direview */
export const reviewableSlugs: string[] = ENABLE_TENANT_DUMMIES ? ["kost-dparagon-ijen-nirwana"] : [];

/* ===== favorit ===== */

export const favoriteSlugsSeed: string[] = [];

/* ===== transaksi booking (Midtrans) ===== */

export type BookingPaymentStatus = "pending" | "paid" | "failed" | "refunding" | "refunded";

export interface BookingPayment {
  id: string;
  bookingId: string;
  propertyName: string;
  amount: number;
  status: BookingPaymentStatus;
  /** ISO timestamp */
  at: string;
}

export const seedUserPayments: BookingPayment[] = ENABLE_TENANT_DUMMIES ? [...dummyUserPayments] : [];

/* ===== pengaduan penyewa ===== */

export type ComplaintCategory =
  | "fasilitas"
  | "air"
  | "listrik"
  | "internet"
  | "kebersihan"
  | "keamanan"
  | "pembayaran"
  | "lainnya";

export type ComplaintStatus = "open" | "acknowledged" | "in_progress" | "resolved" | "closed";

/** alur status pengaduan - dipakai untuk stepper detail */
export const COMPLAINT_FLOW: ComplaintStatus[] = [
  "open",
  "acknowledged",
  "in_progress",
  "resolved",
  "closed",
];

export interface Complaint {
  id: string;
  /** nama pelapor; pengaduan sesi baru memakai nama user login */
  reporter: string;
  propertySlug: string;
  propertyName: string;
  room: string;
  title: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  /** ISO date dibuat */
  at: string;
  updatedAt: string;
  /** respons terakhir owner */
  noteId: string;
  noteEn: string;
}

export const seedComplaints: Complaint[] = ENABLE_TENANT_DUMMIES ? [...dummyComplaints] : [];

/* ===== pengumuman owner untuk penghuni kos ===== */

export interface Announcement {
  id: string;
  propertySlug: string;
  titleId: string;
  titleEn: string;
  bodyId: string;
  bodyEn: string;
  /** ISO timestamp */
  at: string;
}

export const announcements: Announcement[] = ENABLE_TENANT_DUMMIES ? [...dummyAnnouncements] : [];

/** kontak owner untuk halaman tenant (nama = OWNER_PROFILE di entities) */
export const ownerContact = {
  name: "Ratri Wulandari",
  email: "ratri.wulandari@gmail.com",
  phone: "+62 812-3456-7800",
  avatarSeed: "ratri-wulandari",
  since: "2025-02-11",
  responseTimeId: "Biasanya membalas dalam 1 jam",
  responseTimeEn: "Usually replies within 1 hour",
};

/** jarak dari kos ke titik fasilitas sekitar (info area halaman Kos Saya) */
export const nearbyAreas = [
  { key: "campus", v: "600 m" },
  { key: "store", v: "150 m" },
  { key: "mosque", v: "300 m" },
  { key: "hospital", v: "1.2 km" },
] as const;

/* ===== detail kamar & kontrak tenant demo (t-1 / Kost Griya Cemara A-101) ===== */

export const tenantRoomInfo = {
  roomNumber: "A-101",
  floor: 1,
  type: "Standard",
  sizeM2: 16,
  aspect: "2.6 × 6.1 m",
  orientationId: "menghadap taman belakang",
  orientationEn: "facing the back garden",
  facilities: ["bed", "wardrobe", "desk", "ac", "bathroom-in", "wifi"] as Facility[],
};

export const contractInfo = {
  startDate: "2026-08-01",
  endDate: "2027-08-31",
  /** jumlah bulan kontrak aktif */
  durationMonths: 12,
  noticePeriodId: "30 hari sebelum berakhir",
  noticePeriodEn: "30 days before the end date",
  renewalId: "Perpanjangan otomatis jika tidak ada pembatalan tertulis.",
  renewalEn: "Auto-renews unless cancelled in writing.",
};

/** fasilitas bersama (bukan milik kamar) - waktu operasional netral locale */
export const commonRooms = [
  { key: "kitchen", icon: "UtensilsCrossed", hoursId: "06.00 – 22.00", hoursEn: "06:00 – 22:00" },
  { key: "laundry", icon: "WashingMachine", hoursId: "Senin – Sabtu, 08.00 – 17.00", hoursEn: "Mon – Sat, 08:00 – 17:00" },
  { key: "parking", icon: "Car", hoursId: "24 jam", hoursEn: "24 hours" },
  { key: "cctv", icon: "ShieldCheck", hoursId: "24 jam", hoursEn: "24 hours" },
];

/** peraturan kos yang mengikat kontrak */
export const houseRules: { id: string; en: string }[] = [
  { id: "Jam malam pintu utama pukul 23.00.", en: "Main gate closes at 23:00." },
  { id: "Tamu menginap wajib lapor ke pengelola.", en: "Overnight guests must be reported to the manager." },
  { id: "Dilarang merokok di dalam kamar.", en: "No smoking inside rooms." },
  { id: "Sampah dibuang di titik kumpul setiap malam.", en: "Take out trash to the collection point every evening." },
  { id: "Kebisingan dibatasi setelah pukul 22.00.", en: "Noise is limited after 22:00." },
];

/* ===== profil user ===== */

export const userProfile = {
  name: DEMO_USER_NAME,
  email: DEMO_USER_EMAIL,
  phone: "+62 812-3456-7801",
  avatarSeed: "user-imade-sudiarta",
  joinedAt: "2024-11-08",
  cityId: "Bandung",
  cityEn: "Bandung",
  birthPlaceId: "Denpasar",
  birthPlaceEn: "Denpasar",
  birthDate: "1999-04-17",
  gender: "male" as "male" | "female",
  occupationId: "Mahasiswa",
  occupationEn: "Student",
  verifiedAt: "2024-11-09",
};

/** preferensi notifikasi (checkbox settings) */
export const notificationPrefs = [
  { key: "bookingStatus", channelKey: "emailTelegram" },
  { key: "paymentReminder", channelKey: "emailTelegram" },
  { key: "newAnnouncements", channelKey: "telegram" },
  { key: "priceDrops", channelKey: "email" },
  { key: "tips", channelKey: "email" },
] as const;
