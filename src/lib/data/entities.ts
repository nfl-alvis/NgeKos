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
  email: "bayu.pratama@ngekost.id",
};

/** daftar email admin terdaftar — login admin selain ini ditolak */
export const ADMIN_ALLOWED_EMAILS = [
  "bayu.pratama@ngekost.id",
  "operator@ngekost.id",
];

/**
 * Akun demo pencari kos (tempmail sungguhan — dibuat via api.mail.tm,
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
  "kost-griya-cemara-dago",
  "kost-kenanga-setiabudi",
  "kost-al-amin-wonokromo",
  "kost-sara-theresa-cibubur", // pending verifikasi
  "kost-zinnia-cimahi", // ditolak
];

/* ===== booking (Halaman 6, 7, 11) ===== */

export const bookings: Booking[] = [
  {
    id: "BK-1234",
    propertySlug: "kost-griya-cemara-dago",
    propertyName: "Kost Griya Cemara",
    city: "Bandung",
    roomType: "Standard",
    roomId: "gc-standard",
    roomNumber: "A-203",
    startDate: "2026-09-15",
    note: "Saya berencana tinggal minimal 6 bulan.",
    status: "pending",
    applicantName: "Dimas Aryasatya",
    applicantPhone: "+62 812-9907-2148",
    applicantEmail: "dimas.aryasatya@gmail.com",
    createdAt: "2026-09-02T09:14:00",
    payDeadlineMin: 1440,
    usesDp: true,
    monthlyPrice: 1150000,
    timeline: [{ at: "2026-09-02T09:14:00", stage: "diajukan" }],
  },
  {
    id: "BK-1197",
    propertySlug: "kost-kenanga-setiabudi",
    propertyName: "Kost Kenanga",
    city: "Bandung",
    roomType: "Deluxe",
    roomId: "kn-deluxe",
    roomNumber: "B-105",
    startDate: "2026-09-01",
    status: "approved-awaiting-payment",
    applicantName: "Dimas Aryasatya",
    applicantPhone: "+62 812-9907-2148",
    applicantEmail: "dimas.aryasatya@gmail.com",
    createdAt: "2026-08-30T14:02:00",
    payDeadlineMin: 1440,
    usesDp: true,
    monthlyPrice: 1350000,
    timeline: [
      { at: "2026-08-30T14:02:00", stage: "diajukan" },
      { at: "2026-08-31T08:40:00", stage: "disetujui" },
      { at: "2026-08-31T08:40:00", stage: "menunggu-bayar" },
    ],
  },
  {
    id: "BK-1088",
    propertySlug: "kost-bougenville-summbersari",
    propertyName: "Kost Bougenville",
    city: "Malang",
    roomType: "Standard",
    roomId: "bv-standard",
    roomNumber: "C-12",
    startDate: "2026-07-01",
    status: "active",
    applicantName: "Dimas Aryasatya",
    applicantPhone: "+62 812-9907-2148",
    applicantEmail: "dimas.aryasatya@gmail.com",
    createdAt: "2026-06-14T10:30:00",
    payDeadlineMin: 1440,
    usesDp: false,
    monthlyPrice: 780000,
    timeline: [
      { at: "2026-06-14T10:30:00", stage: "diajukan" },
      { at: "2026-06-14T18:22:00", stage: "disetujui" },
      { at: "2026-06-14T18:22:00", stage: "menunggu-bayar" },
      { at: "2026-06-15T09:05:00", stage: "lunas" },
    ],
    payments: [
      { id: "PAY-441", at: "2026-06-15T09:05:00", amount: 780000, status: "berhasil" },
    ],
  },
  {
    id: "BK-0942",
    propertySlug: "kost-pangeran-diponegoro-menteng",
    propertyName: "Kost Pangeran Diponegoro",
    city: "Jakarta",
    roomType: "Standard",
    roomId: "pd-standard",
    roomNumber: "1F-07",
    startDate: "2026-05-01",
    status: "rejected",
    statusNote: "Kamar sudah ditempati penyewa lain sebelum pengajuan diproses.",
    applicantName: "Dimas Aryasatya",
    applicantPhone: "+62 812-9907-2148",
    applicantEmail: "dimas.aryasatya@gmail.com",
    createdAt: "2026-04-19T16:45:00",
    payDeadlineMin: 1440,
    usesDp: true,
    monthlyPrice: 2750000,
    timeline: [{ at: "2026-04-19T16:45:00", stage: "diajukan" }],
  },
];

/* booking masuk ke owner — terpisah dari booking penyewa demo */
export const ownerBookings: Booking[] = [
  {
    id: "BK-1234",
    propertySlug: "kost-griya-cemara-dago",
    propertyName: "Kost Griya Cemara",
    city: "Bandung",
    roomType: "Standard",
    roomId: "gc-standard",
    roomNumber: "A-203",
    startDate: "2026-09-15",
    note: "Saya berencana tinggal minimal 6 bulan.",
    status: "pending",
    applicantName: "Dimas Aryasatya",
    applicantPhone: "+62 812-9907-2148",
    applicantEmail: "dimas.aryasatya@gmail.com",
    createdAt: "2026-09-02T09:14:00",
    payDeadlineMin: 1440,
    usesDp: true,
    monthlyPrice: 1150000,
    timeline: [{ at: "2026-09-02T09:14:00", stage: "diajukan" }],
  },
  {
    id: "BK-1231",
    propertySlug: "kost-griya-cemara-dago",
    propertyName: "Kost Griya Cemara",
    city: "Bandung",
    roomType: "Superior",
    roomId: "gc-superior",
    roomNumber: "A-301",
    startDate: "2026-09-20",
    status: "pending",
    applicantName: "Kevin Hanjaya",
    applicantPhone: "+62 813-2245-8801",
    applicantEmail: "kevin.hanjaya@outlook.com",
    createdAt: "2026-09-02T11:47:00",
    payDeadlineMin: 1440,
    usesDp: true,
    monthlyPrice: 1450000,
    timeline: [{ at: "2026-09-02T11:47:00", stage: "diajukan" }],
  },
  {
    id: "BK-1225",
    propertySlug: "kost-kenanga-setiabudi",
    propertyName: "Kost Kenanga",
    city: "Bandung",
    roomType: "Standard",
    roomId: "kn-standard",
    roomNumber: "B-208",
    startDate: "2026-09-10",
    note: "Boleh checkout akhir pekan?",
    status: "pending",
    applicantName: "Farel Nugraha",
    applicantPhone: "+62 857-6612-0034",
    applicantEmail: "farel.nugraha@gmail.com",
    createdAt: "2026-09-01T19:22:00",
    payDeadlineMin: 1440,
    usesDp: true,
    monthlyPrice: 1050000,
    timeline: [{ at: "2026-09-01T19:22:00", stage: "diajukan" }],
  },
  {
    id: "BK-1197",
    propertySlug: "kost-kenanga-setiabudi",
    propertyName: "Kost Kenanga",
    city: "Bandung",
    roomType: "Deluxe",
    roomId: "kn-deluxe",
    roomNumber: "B-105",
    startDate: "2026-09-01",
    status: "approved-awaiting-payment",
    applicantName: "Dimas Aryasatya",
    applicantPhone: "+62 812-9907-2148",
    applicantEmail: "dimas.aryasatya@gmail.com",
    createdAt: "2026-08-30T14:02:00",
    payDeadlineMin: 1440,
    usesDp: true,
    monthlyPrice: 1350000,
    timeline: [
      { at: "2026-08-30T14:02:00", stage: "diajukan" },
      { at: "2026-08-31T08:40:00", stage: "disetujui" },
      { at: "2026-08-31T08:40:00", stage: "menunggu-bayar" },
    ],
  },
  {
    id: "BK-1180",
    propertySlug: "kost-al-amin-wonokromo",
    propertyName: "Kost Al-Amin",
    city: "Surabaya",
    roomType: "Standard",
    roomId: "aa-standard",
    roomNumber: "D-11",
    startDate: "2026-08-01",
    status: "active",
    applicantName: "Rizky Maulana",
    applicantPhone: "+62 856-3310-7725",
    applicantEmail: "rizky.maulana@yahoo.co.id",
    createdAt: "2026-07-18T13:05:00",
    payDeadlineMin: 1440,
    usesDp: true,
    monthlyPrice: 850000,
    timeline: [
      { at: "2026-07-18T13:05:00", stage: "diajukan" },
      { at: "2026-07-19T09:12:00", stage: "disetujui" },
      { at: "2026-07-19T09:12:00", stage: "menunggu-bayar" },
      { at: "2026-07-19T20:41:00", stage: "lunas" },
    ],
    payments: [
      { id: "PAY-452", at: "2026-07-19T20:41:00", amount: 850000, status: "berhasil" },
    ],
  },
  {
    id: "BK-1155",
    propertySlug: "kost-griya-cemara-dago",
    propertyName: "Kost Griya Cemara",
    city: "Bandung",
    roomType: "Standard",
    roomId: "gc-standard",
    roomNumber: "A-204",
    startDate: "2026-08-01",
    status: "expired",
    applicantName: "Galih Prawira",
    applicantPhone: "+62 812-7755-1902",
    applicantEmail: "galih.prawira@gmail.com",
    createdAt: "2026-07-25T15:30:00",
    payDeadlineMin: 1440,
    usesDp: true,
    monthlyPrice: 1150000,
    timeline: [
      { at: "2026-07-25T15:30:00", stage: "diajukan" },
      { at: "2026-07-26T10:05:00", stage: "disetujui" },
      { at: "2026-07-26T10:05:00", stage: "menunggu-bayar" },
    ],
  },
  {
    id: "BK-1102",
    propertySlug: "kost-kenanga-setiabudi",
    propertyName: "Kost Kenanga",
    city: "Bandung",
    roomType: "Deluxe",
    roomId: "kn-deluxe",
    roomNumber: "B-106",
    startDate: "2026-07-01",
    status: "rejected",
    statusNote: "Kamar sedang diperbaiki, belum layak ditempati.",
    applicantName: "Wulan Sari",
    applicantPhone: "+62 813-9902-4417",
    applicantEmail: "wulan.sari@gmail.com",
    createdAt: "2026-06-20T09:55:00",
    payDeadlineMin: 1440,
    usesDp: true,
    monthlyPrice: 1350000,
    timeline: [{ at: "2026-06-20T09:55:00", stage: "diajukan" }],
  },
];

/* ===== tenant (Halaman 12) ===== */

export const tenants: Tenant[] = [
  {
    id: "t-1",
    name: "I made Sudiarta",
    phone: "+62 812-3456-7801",
    email: "imade.sudiarta@gmail.com",
    propertySlug: "kost-griya-cemara-dago",
    propertyName: "Kost Griya Cemara",
    roomNumber: "A-101",
    paymentStatus: "lunas",
    joinedAt: "2025-08-01",
    monthlyRent: 1150000,
  },
  {
    id: "t-2",
    name: "Anindya Paramitha",
    phone: "+62 813-8890-1145",
    email: "anindya.paramitha@gmail.com",
    propertySlug: "kost-griya-cemara-dago",
    propertyName: "Kost Griya Cemara",
    roomNumber: "A-102",
    paymentStatus: "belum-bayar",
    joinedAt: "2025-10-15",
    monthlyRent: 1150000,
  },
  {
    id: "t-3",
    name: "Bagus Setiawan",
    phone: "+62 856-7712-9034",
    email: "bagus.setiawan@yahoo.co.id",
    propertySlug: "kost-kenanga-setiabudi",
    propertyName: "Kost Kenanga",
    roomNumber: "B-101",
    paymentStatus: "menunggak",
    joinedAt: "2025-06-20",
    monthlyRent: 1050000,
  },
  {
    id: "t-4",
    name: "Citra Lestari Dewi",
    phone: "+62 812-2250-6688",
    email: "citra.lestari@gmail.com",
    propertySlug: "kost-kenanga-setiabudi",
    propertyName: "Kost Kenanga",
    roomNumber: "B-102",
    paymentStatus: "lunas",
    joinedAt: "2026-01-05",
    monthlyRent: 1350000,
  },
  {
    id: "t-5",
    name: "Muhammad Iqbal",
    phone: "+62 857-4431-2276",
    email: "m.iqbal91@gmail.com",
    propertySlug: "kost-al-amin-wonokromo",
    propertyName: "Kost Al-Amin",
    roomNumber: "D-01",
    paymentStatus: "lunas",
    joinedAt: "2026-03-02",
    monthlyRent: 850000,
  },
  {
    id: "t-6",
    name: "Sarah Amelia Pohan",
    phone: "+62 812-6674-0912",
    email: "sarah.amelia@gmail.com",
    propertySlug: "kost-al-amin-wonokromo",
    propertyName: "Kost Al-Amin",
    roomNumber: "D-02",
    paymentStatus: "belum-bayar",
    joinedAt: "2026-04-18",
    monthlyRent: 1100000,
  },
];

export const rentalAgreements: RentalAgreement[] = [
  { tenantId: "t-1", property: "Kost Griya Cemara", room: "A-101", period: "Agu 2025 - Agu 2026", rent: 1150000 },
  { tenantId: "t-1", property: "Kost Griya Cemara", room: "A-101", period: "Agu 2026 - Agu 2027", rent: 1200000 },
  { tenantId: "t-3", property: "Kost Kenanga", room: "B-101", period: "Jun 2025 - Jun 2026", rent: 1000000 },
  { tenantId: "t-3", property: "Kost Kenanga", room: "B-101", period: "Jun 2026 - Jun 2027", rent: 1050000 },
];

/* ===== invoice (Halaman 13) ===== */

export const invoices: Invoice[] = [
  { id: "INV-2609-01", tenantName: "I made Sudiarta", period: "September 2026", amount: 1200000, status: "lunas", dueDate: "2026-09-05", paidAt: "2026-09-01" },
  { id: "INV-2609-02", tenantName: "Anindya Paramitha", period: "September 2026", amount: 1150000, status: "belum-lunas", dueDate: "2026-09-05" },
  { id: "INV-2609-03", tenantName: "Bagus Setiawan", period: "September 2026", amount: 1050000, status: "belum-lunas", dueDate: "2026-08-28" },
  { id: "INV-2609-04", tenantName: "Citra Lestari Dewi", period: "September 2026", amount: 1350000, status: "lunas", dueDate: "2026-09-05", paidAt: "2026-09-02" },
  { id: "INV-2608-11", tenantName: "Bagus Setiawan", period: "Agustus 2026", amount: 1000000, status: "belum-lunas", dueDate: "2026-07-28" },
  { id: "INV-2608-12", tenantName: "Muhammad Iqbal", period: "Agustus 2026", amount: 850000, status: "lunas", dueDate: "2026-08-05", paidAt: "2026-08-03" },
  { id: "INV-2608-13", tenantName: "Sarah Amelia Pohan", period: "Agustus 2026", amount: 1100000, status: "lunas", dueDate: "2026-08-05", paidAt: "2026-08-04" },
];

/* ===== notifikasi (Halaman 14) ===== */

export const notifications: NotificationItem[] = [
  {
    id: "n-1",
    type: "booking",
    title: "Booking baru #BK-1234",
    body: "Dimas Aryasatya mengajukan booking Kamar A-203, Kost Griya Cemara.",
    at: "2026-09-02T09:14:00",
    read: false,
    linkUrl: "/owner/bookings",
  },
  {
    id: "n-2",
    type: "payment",
    title: "Pembayaran diterima",
    body: "Citra Lestari Dewi melunasi tagihan September 2026 (Rp1.350.000).",
    at: "2026-09-02T08:02:00",
    read: false,
    linkUrl: "/owner/invoices",
  },
  {
    id: "n-3",
    type: "booking",
    title: "Booking baru #BK-1231",
    body: "Kevin Hanjaya mengajukan booking Kamar A-301, Kost Griya Cemara.",
    at: "2026-09-02T11:47:00",
    read: false,
    linkUrl: "/owner/bookings",
  },
  {
    id: "n-4",
    type: "subscription",
    title: "Trial berakhir 12 hari lagi",
    body: "Perpanjang ke paket berbayar agar data dan propertimu tetap aktif.",
    at: "2026-09-01T07:00:00",
    read: true,
    linkUrl: "/owner/subscription",
  },
  {
    id: "n-5",
    type: "payment",
    title: "Pembayaran gagal",
    body: "Percobaan bayar #BK-1197 (Dimas Aryasatya) tidak berhasil — dana belum masuk.",
    at: "2026-08-31T21:18:00",
    read: true,
    linkUrl: "/owner/bookings",
  },
  {
    id: "n-6",
    type: "booking",
    title: "Booking kedaluwarsa #BK-1155",
    body: "Galih Prawira tidak menyelesaikan pembayaran sebelum batas waktu.",
    at: "2026-08-29T10:05:00",
    read: true,
    linkUrl: "/owner/bookings",
  },
];

/* ===== pesan (Halaman 15) ===== */

export const conversations: Conversation[] = [
  {
    id: "c-1",
    name: "Anindya Paramitha",
    channel: "telegram",
    telegramConnected: true,
    unread: 2,
    messages: [
      { id: "m-1", from: "contact", text: "Bu, tagihan September sudah terbit?", at: "2026-09-02T08:12:00", channel: "telegram" },
      { id: "m-2", from: "owner", text: "Sudah ya Ndin, sudah terbit kemarin. Tenggatnya 5 September.", at: "2026-09-02T08:20:00", channel: "telegram" },
      { id: "m-3", from: "contact", text: "Oke, mau bayar besok pagi. Nominalnya 1.150.000 ya?", at: "2026-09-02T08:24:00", channel: "telegram" },
      { id: "m-4", from: "contact", text: "Bisa via transfer bank biasa?", at: "2026-09-02T08:25:00", channel: "telegram" },
    ],
  },
  {
    id: "c-2",
    name: "Rizky Maulana",
    channel: "email",
    telegramConnected: false,
    unread: 0,
    messages: [
      { id: "m-5", from: "contact", text: "Selamat pagi, saya mau tanya soal perpanjangan kontrak Desember.", at: "2026-09-01T09:40:00", channel: "email" },
      { id: "m-6", from: "owner", text: "Selamat pagi Rizky, bisa. Kontrak diperpanjang otomatis kalau tidak ada pembatalan.", at: "2026-09-01T10:02:00", channel: "email" },
    ],
  },
  {
    id: "c-3",
    name: "Dimas Aryasatya",
    channel: "telegram",
    telegramConnected: true,
    unread: 1,
    messages: [
      { id: "m-7", from: "contact", text: "Terima kasih, bookingnya sudah saya ajukan.", at: "2026-09-02T09:20:00", channel: "telegram" },
      { id: "m-8", from: "contact", text: "Kira-kira kapan ya bisa dikonfirmasi?", at: "2026-09-02T09:21:00", channel: "telegram" },
    ],
  },
  {
    id: "c-4",
    name: "Sarah Amelia Pohan",
    channel: "telegram",
    telegramConnected: false,
    unread: 0,
    messages: [
      { id: "m-9", from: "contact", text: "Bu, wifi di lantai dua lambat sejak kemarin.", at: "2026-08-31T19:44:00", channel: "telegram" },
      { id: "m-10", from: "owner", text: "Terima kasih infonya, teknisi datang besok pagi ya.", at: "2026-08-31T20:01:00", channel: "telegram" },
    ],
  },
];

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

export const verificationQueue: AdminReviewEntry[] = [
  {
    id: "VR-031",
    propertySlug: "kost-sara-theresa-cibubur",
    propertyName: "Kost Sara Theresa",
    city: "Jakarta",
    ownerName: "Ratri Wulandari",
    ownerEmail: "ratri.wulandari@gmail.com",
    ownerJoinedAt: "2025-02-11",
    submittedAt: "2026-09-01",
  },
  {
    id: "VR-030",
    propertySlug: "kost-zinnia-cimahi",
    propertyName: "Kost Zinnia",
    city: "Bandung",
    ownerName: "Ratri Wulandari",
    ownerEmail: "ratri.wulandari@gmail.com",
    ownerJoinedAt: "2025-02-11",
    submittedAt: "2026-08-27",
  },
];

export const verificationHistory: AdminReviewEntry[] = [
  {
    id: "VR-029",
    propertySlug: "kost-bougenville-summbersari",
    propertyName: "Kost Bougenville",
    city: "Malang",
    ownerName: "Hendra Wijaya",
    ownerEmail: "hendra.wijaya@gmail.com",
    ownerJoinedAt: "2024-11-03",
    submittedAt: "2026-08-20",
    decidedAt: "2026-08-21",
    decidedBy: "Bayu Pratama",
    decision: "approved",
  },
  {
    id: "VR-028",
    propertySlug: "kost-zinnia-cimahi",
    propertyName: "Kost Zinnia",
    city: "Bandung",
    ownerName: "Ratri Wulandari",
    ownerEmail: "ratri.wulandari@gmail.com",
    ownerJoinedAt: "2025-02-11",
    submittedAt: "2026-08-10",
    decidedAt: "2026-08-12",
    decidedBy: "Sinta Maharani",
    decision: "rejected",
    rejectionReason: "Foto fasilitas tidak sesuai dengan kondisi kamar saat pemeriksaan lapangan.",
  },
  {
    id: "VR-027",
    propertySlug: "kost-mutiara-gading-serpong",
    propertyName: "Kost Mutiara Gading",
    city: "Tangerang",
    ownerName: "Yohanes Simanjuntak",
    ownerEmail: "yohanes.s@gmail.com",
    ownerJoinedAt: "2025-05-19",
    submittedAt: "2026-08-05",
    decidedAt: "2026-08-06",
    decidedBy: "Bayu Pratama",
    decision: "approved",
  },
  {
    id: "VR-026",
    propertySlug: "kost-ratna-darmo",
    propertyName: "Kost Ratna",
    city: "Surabaya",
    ownerName: "Lilis Handayani",
    ownerEmail: "lilis.handayani@gmail.com",
    ownerJoinedAt: "2025-09-30",
    submittedAt: "2026-07-28",
    decidedAt: "2026-07-30",
    decidedBy: "Sinta Maharani",
    decision: "approved",
  },
];

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

export const ownerReviews: OwnerReview[] = [
  {
    id: "rv-1",
    authorName: "Anindya P.",
    propertySlug: "kost-griya-cemara-dago",
    rating: 5,
    at: "2026-09-01",
    bodyId: "Kamar bersih, air panas lancar, pemilik responsif. recommended untuk mahasiswa.",
    bodyEn: "Clean room, hot water works well, responsive owner. Recommended for students.",
  },
  {
    id: "rv-2",
    authorName: "Kevin H.",
    propertySlug: "kost-kenanga-setiabudi",
    rating: 4,
    at: "2026-08-24",
    bodyId: "Lokasi strategis dan parkir luas. Dinding kamar agak tipis saat malam.",
    bodyEn: "Strategic location and wide parking. Room walls are a bit thin at night.",
  },
  {
    id: "rv-3",
    authorName: "Sarah A.",
    propertySlug: "kost-al-amin-wonokromo",
    rating: 5,
    at: "2026-08-17",
    bodyId: "WiFi stabil untuk kerja remote, dapur bersama selalu bersih. Betah tinggal di sini.",
    bodyEn: "Stable WiFi for remote work, shared kitchen always clean. Feels great living here.",
  },
];

/* ===== room grid untuk Halaman 10 (dummy per property slug) ===== */

export interface RoomUnit {
  number: string;
  status: "kosong" | "terisi" | "maintenance" | "dipesan";
}

export const roomUnits: Record<string, RoomUnit[]> = {
  "kost-griya-cemara-dago": [
    { number: "A-101", status: "terisi" },
    { number: "A-102", status: "terisi" },
    { number: "A-103", status: "kosong" },
    { number: "A-104", status: "maintenance" },
    { number: "A-201", status: "kosong" },
    { number: "A-202", status: "dipesan" },
    { number: "A-203", status: "dipesan" },
    { number: "A-301", status: "kosong" },
  ],
  "kost-kenanga-setiabudi": [
    { number: "B-101", status: "terisi" },
    { number: "B-102", status: "terisi" },
    { number: "B-105", status: "dipesan" },
    { number: "B-106", status: "maintenance" },
    { number: "B-107", status: "kosong" },
    { number: "B-108", status: "kosong" },
  ],
  "kost-al-amin-wonokromo": [
    { number: "D-01", status: "terisi" },
    { number: "D-02", status: "terisi" },
    { number: "D-03", status: "kosong" },
    { number: "D-04", status: "kosong" },
    { number: "D-05", status: "maintenance" },
    { number: "D-11", status: "terisi" },
  ],
};

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
