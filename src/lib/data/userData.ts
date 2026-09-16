/**
 * Dataset domain "user biasa" (pencari/penyewa) + detail tenancy tenant demo.
 * Dipakai bersama oleh /dashboard (aktivitas mencari kos) dan
 * /tenant/* (aktivitas tinggal di kos) — lihat rencana pemisahan dashboard.
 */

import type { Facility } from "./types";

/* ===== akun demo ===== */

/** email sesi demo → identitas tenant aktif (tenants t-1) */
export const DEMO_USER_EMAIL = "imade.sudiarta@gmail.com";
export const DEMO_USER_NAME = "I made Sudiarta";

/** tanggal "sekarang" versi demo — konstan supaya copy relatif tidak bergeser */
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

export const seedUserReviews: UserReview[] = [
  {
    id: "ur-1",
    propertySlug: "kost-griya-cemara-dago",
    propertyName: "Kost Griya Cemara",
    authorName: "I made S.",
    mine: true,
    rating: 5,
    at: "2026-08-20",
    editable: true,
    bodyId: "Kamar bersih, air panas lancar, pemilik responsif.",
    bodyEn: "Clean room, hot water works well, responsive owner.",
  },
  {
    id: "ur-2",
    propertySlug: "kost-bougenville-summbersari",
    propertyName: "Kost Bougenville",
    authorName: "Anindya P.",
    mine: false,
    rating: 4,
    at: "2026-08-11",
    editable: false,
    bodyId: "Lokasi dekat kampus, WiFi stabil untuk kerja remote.",
    bodyEn: "Close to campus, stable WiFi for remote work.",
  },
  {
    id: "ur-3",
    propertySlug: "kost-al-amin-wonokromo",
    propertyName: "Kost Al-Amin",
    authorName: "Kevin H.",
    mine: false,
    rating: 5,
    at: "2026-07-28",
    editable: false,
    bodyId: "Dapur bersama selalu bersih, parkir luas.",
    bodyEn: "Shared kitchen always clean, wide parking.",
  },
  {
    id: "ur-4",
    propertySlug: "kost-kenanga-setiabudi",
    propertyName: "Kost Kenanga",
    authorName: "Sarah A.",
    mine: false,
    rating: 4,
    at: "2026-07-05",
    editable: false,
    bodyId: "Kamar nyaman, dinding agak tipis saat malam.",
    bodyEn: "Comfy room, walls are a bit thin at night.",
  },
];

/** kos yang pernah ditinggali user → bisa direview */
export const reviewableSlugs = [
  "kost-griya-cemara-dago",
  "kost-bougenville-summbersari",
  "kost-al-amin-wonokromo",
];

/* ===== favorit ===== */

export const favoriteSlugsSeed = [
  "kost-griya-cemara-dago",
  "kost-bougenville-summbersari",
  "kost-putri-mawar-kotabaru",
];

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

export const seedUserPayments: BookingPayment[] = [
  { id: "PAY-1197", bookingId: "BK-1197", propertyName: "Kost Kenanga", amount: 1350000, status: "pending", at: "2026-08-31T08:45:00" },
  { id: "PAY-1088", bookingId: "BK-1088", propertyName: "Kost Bougenville", amount: 780000, status: "paid", at: "2026-06-15T09:05:00" },
  { id: "PAY-0942", bookingId: "BK-0942", propertyName: "Kost Pangeran Diponegoro", amount: 2750000, status: "refunding", at: "2026-04-20T11:02:00" },
];

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

/** alur status pengaduan — dipakai untuk stepper detail */
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

export const seedComplaints: Complaint[] = [
  {
    id: "CP-2609-01",
    reporter: "I made Sudiarta",
    propertySlug: "kost-griya-cemara-dago",
    propertyName: "Kost Griya Cemara",
    room: "A-101",
    title: "AC kurang dingin",
    category: "fasilitas",
    status: "in_progress",
    at: "2026-09-02",
    updatedAt: "2026-09-03",
    noteId: "Teknisi dijadwalkan datang Jumat 4 September pukul 09.00.",
    noteEn: "Technician scheduled for Friday, 4 September at 09:00.",
  },
  {
    id: "CP-2608-14",
    reporter: "Anindya Paramitha",
    propertySlug: "kost-griya-cemara-dago",
    propertyName: "Kost Griya Cemara",
    room: "A-102",
    title: "WiFi lantai satu sering putus",
    category: "internet",
    status: "resolved",
    at: "2026-08-24",
    updatedAt: "2026-08-27",
    noteId: "Router diganti, koneksi stabil kembali.",
    noteEn: "Router replaced, connection is stable again.",
  },
  {
    id: "CP-2608-07",
    reporter: "I made Sudiarta",
    propertySlug: "kost-griya-cemara-dago",
    propertyName: "Kost Griya Cemara",
    room: "A-101",
    title: "Lampu koridor mati",
    category: "listrik",
    status: "closed",
    at: "2026-08-10",
    updatedAt: "2026-08-14",
    noteId: "Lampu diganti oleh pengelola.",
    noteEn: "Light replaced by the building manager.",
  },
];

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

export const announcements: Announcement[] = [
  {
    id: "an-1",
    propertySlug: "kost-griya-cemara-dago",
    titleId: "Maintenance WiFi",
    titleEn: "WiFi maintenance",
    bodyId: "WiFi akan mengalami gangguan pada 5 September 2026 pukul 01.00–03.00 untuk penggantian router lantai dua.",
    bodyEn: "WiFi will be disrupted on 5 September 2026, 01:00–03:00, for a router replacement on the second floor.",
    at: "2026-09-02T10:15:00",
  },
  {
    id: "an-2",
    propertySlug: "kost-griya-cemara-dago",
    titleId: "Jadwal buang sampah besar",
    titleEn: "Bulk waste schedule",
    bodyId: "Sampah ukuran besar (kasur, lemari) bisa ditaruh di area belakang pada Sabtu pukul 07.00.",
    bodyEn: "Bulky waste (mattress, wardrobe) can be placed in the back area on Saturday at 07:00.",
    at: "2026-08-30T08:40:00",
  },
  {
    id: "an-3",
    propertySlug: "kost-griya-cemara-dago",
    titleId: "Ronda keamanan malam",
    titleEn: "Night security patrol",
    bodyId: "Mulai September, ronda keamanan berjalan setiap hari pukul 22.00–02.00.",
    bodyEn: "Starting September, the security patrol runs daily from 22:00 to 02:00.",
    at: "2026-08-27T16:05:00",
  },
  {
    id: "an-4",
    propertySlug: "kost-griya-cemara-dago",
    titleId: "Pembayaran listrik bulan Agustus",
    titleEn: "August electricity payment",
    bodyId: "Tagihan listrik bersama bulan Agustus sudah dibagikan, nominal tertera di invoice masing-masing.",
    bodyEn: "The shared August electricity bill has been distributed, amounts are on each invoice.",
    at: "2026-08-20T09:30:00",
  },
];

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

/** fasilitas bersama (bukan milik kamar) — waktu operasional netral locale */
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
