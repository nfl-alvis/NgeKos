/**
 * Modul Terpusat Data Dummy Tenant — NgeKos
 *
 * Berisi dataset dummy realistis untuk domain tenant (penyewa kos),
 * mencakup: penyewa, booking aktif, kontrak sewa, invoice/tagihan,
 * riwayat pembayaran, pengaduan fasilitas, pengumuman kos, dan percakapan.
 *
 * PENGATURAN HAPUS CEPAT:
 * Cukup ubah `ENABLE_TENANT_DUMMIES = false` atau panggil `npm run dummy:purge`
 * untuk membersihkan seluruh data dummy tanpa mempengaruhi sistem inti.
 */

import type {
  Booking,
  Tenant,
  RentalAgreement,
  Invoice,
  Conversation,
} from "./types";
import type {
  Complaint,
  Announcement,
  BookingPayment,
  UserReview,
} from "./userData";

/** Flag toggle global: set ke false untuk menonaktifkan seluruh data dummy */
export const ENABLE_TENANT_DUMMIES = true;

/* ===== 1. DAFTAR PENYEWA (TENANTS) ===== */
export const dummyTenants: Tenant[] = [
  {
    id: "dummy-tenant-1",
    name: "I Made Sudiarta",
    phone: "+62 812-3456-7801",
    email: "imade.sudiarta@gmail.com",
    propertySlug: "kost-dparagon-ijen-nirwana",
    propertyName: "D'Paragon Ijen Nirwana",
    roomNumber: "D-01",
    paymentStatus: "lunas",
    joinedAt: "2026-08-01",
    monthlyRent: 2100000,
  },
  {
    id: "dummy-tenant-2",
    name: "Anisa Rahmawati",
    phone: "+62 813-8890-1234",
    email: "anisa.rahmawati@dummy.ngekos.biz.id",
    propertySlug: "kost-putri-bu-sastro",
    propertyName: "Kost Putri Bu Sastro",
    roomNumber: "A-02",
    paymentStatus: "lunas",
    joinedAt: "2026-07-15",
    monthlyRent: 1250000,
  },
  {
    id: "dummy-tenant-3",
    name: "Dimas Pratama",
    phone: "+62 856-7788-9900",
    email: "dimas.pratama@dummy.ngekos.biz.id",
    propertySlug: "kost-dparagon-songgolangit",
    propertyName: "D'Paragon Songgolangit",
    roomNumber: "D-03",
    paymentStatus: "belum-bayar",
    joinedAt: "2026-09-01",
    monthlyRent: 1950000,
  },
  {
    id: "dummy-tenant-4",
    name: "Nabila Putri",
    phone: "+62 878-2233-4455",
    email: "nabila.putri@dummy.ngekos.biz.id",
    propertySlug: "kost-bougenville-summbersari",
    propertyName: "Kost Bougenville Sumbersari",
    roomNumber: "S-01",
    paymentStatus: "lunas",
    joinedAt: "2026-06-01",
    monthlyRent: 950000,
  },
  {
    id: "dummy-tenant-5",
    name: "Farhan Ramadhan",
    phone: "+62 811-9988-7766",
    email: "farhan.ramadhan@dummy.ngekos.biz.id",
    propertySlug: "kost-dparagon-ijen-nirwana",
    propertyName: "D'Paragon Ijen Nirwana",
    roomNumber: "V-01",
    paymentStatus: "menunggak",
    joinedAt: "2026-05-10",
    monthlyRent: 2600000,
  },
];

/* ===== 2. KONTRAK SEWA (RENTAL AGREEMENTS) ===== */
export const dummyRentalAgreements: RentalAgreement[] = [
  {
    tenantId: "dummy-tenant-1",
    property: "D'Paragon Ijen Nirwana",
    room: "D-01 (Deluxe)",
    period: "1 Agu 2026 – 31 Jul 2027",
    rent: 2100000,
  },
  {
    tenantId: "dummy-tenant-2",
    property: "Kost Putri Bu Sastro",
    room: "A-02 (Deluxe AC)",
    period: "15 Jul 2026 – 14 Jul 2027",
    rent: 1250000,
  },
  {
    tenantId: "dummy-tenant-3",
    property: "D'Paragon Songgolangit",
    room: "D-03 (Deluxe)",
    period: "1 Sep 2026 – 28 Feb 2027",
    rent: 1950000,
  },
  {
    tenantId: "dummy-tenant-4",
    property: "Kost Bougenville Sumbersari",
    room: "S-01 (Standard)",
    period: "1 Jun 2026 – 31 Mei 2027",
    rent: 950000,
  },
  {
    tenantId: "dummy-tenant-5",
    property: "D'Paragon Ijen Nirwana",
    room: "V-01 (VIP)",
    period: "10 Mei 2026 – 9 Mei 2027",
    rent: 2600000,
  },
];

/* ===== 3. INVOICE & TAGIHAN SEWA ===== */
export const dummyInvoices: Invoice[] = [
  // I Made Sudiarta (t-1)
  {
    id: "INV-2026-08-001",
    tenantName: "I Made Sudiarta",
    period: "Agustus 2026",
    amount: 2100000,
    status: "lunas",
    dueDate: "2026-08-05",
    paidAt: "2026-08-02",
  },
  {
    id: "INV-2026-09-001",
    tenantName: "I Made Sudiarta",
    period: "September 2026",
    amount: 2100000,
    status: "lunas",
    dueDate: "2026-09-05",
    paidAt: "2026-09-01",
  },
  {
    id: "INV-2026-10-001",
    tenantName: "I Made Sudiarta",
    period: "Oktober 2026",
    amount: 2100000,
    status: "belum-lunas",
    dueDate: "2026-10-25",
  },
  // Anisa Rahmawati (t-2)
  {
    id: "INV-2026-09-002",
    tenantName: "Anisa Rahmawati",
    period: "September 2026",
    amount: 1250000,
    status: "lunas",
    dueDate: "2026-09-15",
    paidAt: "2026-09-14",
  },
  {
    id: "INV-2026-10-002",
    tenantName: "Anisa Rahmawati",
    period: "Oktober 2026",
    amount: 1250000,
    status: "belum-lunas",
    dueDate: "2026-10-15",
  },
  // Dimas Pratama (t-3)
  {
    id: "INV-2026-09-003",
    tenantName: "Dimas Pratama",
    period: "September 2026",
    amount: 1950000,
    status: "belum-lunas",
    dueDate: "2026-09-10",
  },
  // Nabila Putri (t-4)
  {
    id: "INV-2026-09-004",
    tenantName: "Nabila Putri",
    period: "September 2026",
    amount: 950000,
    status: "lunas",
    dueDate: "2026-09-05",
    paidAt: "2026-09-04",
  },
  // Farhan Ramadhan (t-5)
  {
    id: "INV-2026-08-005",
    tenantName: "Farhan Ramadhan",
    period: "Agustus 2026",
    amount: 2600000,
    status: "belum-lunas",
    dueDate: "2026-08-10",
  },
  {
    id: "INV-2026-09-005",
    tenantName: "Farhan Ramadhan",
    period: "September 2026",
    amount: 2600000,
    status: "belum-lunas",
    dueDate: "2026-09-10",
  },
];

/* ===== 4. RIWAYAT PEMBAYARAN USER ===== */
export const dummyUserPayments: BookingPayment[] = [
  {
    id: "PAY-2026-0801",
    bookingId: "BK-DUMMY-01",
    propertyName: "D'Paragon Ijen Nirwana",
    amount: 2100000,
    status: "paid",
    at: "2026-08-02T10:15:00Z",
  },
  {
    id: "PAY-2026-0901",
    bookingId: "BK-DUMMY-01",
    propertyName: "D'Paragon Ijen Nirwana",
    amount: 2100000,
    status: "paid",
    at: "2026-09-01T14:30:00Z",
  },
];

/* ===== 5. PENGADUAN PENYEWA (COMPLAINTS) ===== */
export const dummyComplaints: Complaint[] = [
  {
    id: "CMP-2026-001",
    reporter: "I Made Sudiarta",
    propertySlug: "kost-dparagon-ijen-nirwana",
    propertyName: "D'Paragon Ijen Nirwana",
    room: "D-01",
    title: "Kran wastafel kamar mandi menetes halus",
    category: "fasilitas",
    status: "in_progress",
    at: "2026-09-02",
    updatedAt: "2026-09-03",
    noteId: "Sudah dikonfirmasi. Teknisi pipa dijadwalkan datang besok pukul 10.00 WIB.",
    noteEn: "Confirmed. Plumber technician is scheduled to visit tomorrow at 10:00 AM.",
  },
  {
    id: "CMP-2026-002",
    reporter: "I Made Sudiarta",
    propertySlug: "kost-dparagon-ijen-nirwana",
    propertyName: "D'Paragon Ijen Nirwana",
    room: "D-01",
    title: "Koneksi WiFi lantai 1 sempat lambat di jam malam",
    category: "fasilitas",
    status: "resolved",
    at: "2026-08-20",
    updatedAt: "2026-08-21",
    noteId: "Access point router sudah direstart dan kabel LAN diganti baru. Koneksi kembali normal.",
    noteEn: "Access point router has been restarted and LAN cable replaced. Connection restored to normal.",
  },
  {
    id: "CMP-2026-003",
    reporter: "I Made Sudiarta",
    propertySlug: "kost-dparagon-ijen-nirwana",
    propertyName: "D'Paragon Ijen Nirwana",
    room: "D-01",
    title: "Bohlam lampu meja belajar redup",
    category: "fasilitas",
    status: "closed",
    at: "2026-08-10",
    updatedAt: "2026-08-11",
    noteId: "Bohlam LED Philips 12W sudah diganti baru oleh staf kos.",
    noteEn: "Philips 12W LED bulb has been replaced by boarding house staff.",
  },
];

/* ===== 6. PENGUMUMAN PEMILIK KOS (ANNOUNCEMENTS) ===== */
export const dummyAnnouncements: Announcement[] = [
  {
    id: "ANN-2026-001",
    propertySlug: "kost-dparagon-ijen-nirwana",
    titleId: "Pembersihan Rutin Toren Air & Filter",
    titleEn: "Routine Water Tank & Filter Cleaning",
    bodyId:
      "Diberitahukan kepada seluruh penghuni bahwa hari Minggu, 18 Oktober 2026 pukul 08.00–10.00 WIB akan dilakukan pembersihan toren air. Aliran air dimatikan sementara selama pengerjaan.",
    bodyEn:
      "Notice to all residents that on Sunday, October 18, 2026 at 08:00–10:00 AM water tank cleaning will take place. Water supply will be temporarily stopped during maintenance.",
    at: "2026-10-12T09:00:00Z",
  },
  {
    id: "ANN-2026-002",
    propertySlug: "kost-dparagon-ijen-nirwana",
    titleId: "Pemberlakuan Akses Kartu RFID Gerbang Baru",
    titleEn: "New RFID Gate Access Card Implementation",
    bodyId:
      "Mulai 1 November 2026, gerbang utama menggunakan sistem kartu akses RFID mandiri 24 jam. Kartu dapat diambil di kantor pengelola mulai tanggal 25 Oktober.",
    bodyEn:
      "Starting November 1, 2026, main gate will use a 24-hour RFID access card system. Cards can be collected at manager office starting October 25.",
    at: "2026-10-05T14:30:00Z",
  },
  {
    id: "ANN-2026-003",
    propertySlug: "kost-dparagon-ijen-nirwana",
    titleId: "Himbauan Ketenangan Menjelang Pekan Ujian (UTS)",
    titleEn: "Quiet Hours Notice Ahead of Midterm Exams",
    bodyId:
      "Mengingat pekan ujian tengah semester mahasiswa UB dan UM, mohon seluruh penghuni menjaga ketenangan di koridor dan ruang bersama setelah pukul 22.00 WIB.",
    bodyEn:
      "Given the midterm exam week for UB and UM students, all residents are requested to maintain quietness in hallways and common areas after 10:00 PM.",
    at: "2026-09-28T08:00:00Z",
  },
];

/* ===== 7. PERCAKAPAN CHAT (CONVERSATIONS) ===== */
export const dummyConversations: Conversation[] = [
  {
    id: "conv-dummy-1",
    name: "I Made Sudiarta",
    channel: "telegram",
    telegramConnected: true,
    unread: 0,
    propertyName: "D'Paragon Ijen Nirwana",
    propertySlug: "kost-dparagon-ijen-nirwana",
    messages: [
      {
        id: "msg-1",
        from: "contact",
        text: "Selamat sore Bu Ratri, untuk bukti pembayaran sewa bulan September sudah saya transfer via BCA ya.",
        at: "2026-09-01T14:32:00Z",
        channel: "telegram",
        status: "read",
      },
      {
        id: "msg-2",
        from: "owner",
        text: "Terima kasih Mas Made, pembayaran sudah kami verifikasi dan invoice September sudah lunas. Selamat beraktivitas!",
        at: "2026-09-01T14:35:00Z",
        channel: "telegram",
        status: "delivered",
      },
    ],
  },
  {
    id: "conv-dummy-2",
    name: "Anisa Rahmawati",
    channel: "telegram",
    telegramConnected: true,
    unread: 1,
    propertyName: "Kost Putri Bu Sastro",
    propertySlug: "kost-putri-bu-sastro",
    messages: [
      {
        id: "msg-3",
        from: "contact",
        text: "Bu Ratri, apakah besok Sabtu boleh izin teman perempuan saya menginap 1 malam untuk kerja kelompok?",
        at: "2026-10-15T18:20:00Z",
        channel: "telegram",
        status: "delivered",
      },
    ],
  },
];

/* ===== 8. BOOKINGS AKTIF ===== */
export const dummyBookings: Booking[] = [
  {
    id: "BK-DUMMY-01",
    code: "BK-20260801-D01",
    propertySlug: "kost-dparagon-ijen-nirwana",
    propertyName: "D'Paragon Ijen Nirwana",
    city: "Malang",
    roomType: "Deluxe",
    roomId: "dp-deluxe",
    roomNumber: "D-01",
    startDate: "2026-08-01",
    status: "active",
    applicantName: "I Made Sudiarta",
    applicantPhone: "+62 812-3456-7801",
    applicantEmail: "imade.sudiarta@gmail.com",
    createdAt: "2026-07-28T09:00:00Z",
    payDeadlineMin: 1440,
    usesDp: false,
    monthlyPrice: 2100000,
    timeline: [
      { at: "2026-07-28T09:00:00Z", stage: "diajukan" },
      { at: "2026-07-28T10:30:00Z", stage: "disetujui" },
      { at: "2026-08-01T08:00:00Z", stage: "lunas" },
    ],
  },
  {
    id: "BK-DUMMY-02",
    code: "BK-20260715-A02",
    propertySlug: "kost-putri-bu-sastro",
    propertyName: "Kost Putri Bu Sastro",
    city: "Malang",
    roomType: "Deluxe AC",
    roomId: "bs-deluxe-ac",
    roomNumber: "A-02",
    startDate: "2026-07-15",
    status: "active",
    applicantName: "Anisa Rahmawati",
    applicantPhone: "+62 813-8890-1234",
    applicantEmail: "anisa.rahmawati@dummy.ngekos.biz.id",
    createdAt: "2026-07-10T11:20:00Z",
    payDeadlineMin: 1440,
    usesDp: false,
    monthlyPrice: 1250000,
    timeline: [
      { at: "2026-07-10T11:20:00Z", stage: "diajukan" },
      { at: "2026-07-10T13:00:00Z", stage: "disetujui" },
      { at: "2026-07-15T09:00:00Z", stage: "lunas" },
    ],
  },
  {
    id: "BK-DUMMY-03",
    code: "BK-20260901-D03",
    propertySlug: "kost-dparagon-songgolangit",
    propertyName: "D'Paragon Songgolangit",
    city: "Malang",
    roomType: "Deluxe",
    roomId: "ds-deluxe",
    roomNumber: "D-03",
    startDate: "2026-09-01",
    status: "active",
    applicantName: "Dimas Pratama",
    applicantPhone: "+62 856-7788-9900",
    applicantEmail: "dimas.pratama@dummy.ngekos.biz.id",
    createdAt: "2026-08-25T14:10:00Z",
    payDeadlineMin: 1440,
    usesDp: true,
    monthlyPrice: 1950000,
    timeline: [
      { at: "2026-08-25T14:10:00Z", stage: "diajukan" },
      { at: "2026-08-25T16:00:00Z", stage: "disetujui" },
      { at: "2026-09-01T10:00:00Z", stage: "lunas" },
    ],
  },
  {
    id: "BK-DUMMY-04",
    code: "BK-20260601-S01",
    propertySlug: "kost-bougenville-summbersari",
    propertyName: "Kost Bougenville Sumbersari",
    city: "Malang",
    roomType: "Standard",
    roomId: "bs-standard",
    roomNumber: "S-01",
    startDate: "2026-06-01",
    status: "active",
    applicantName: "Nabila Putri",
    applicantPhone: "+62 878-2233-4455",
    applicantEmail: "nabila.putri@dummy.ngekos.biz.id",
    createdAt: "2026-05-20T10:00:00Z",
    payDeadlineMin: 1440,
    usesDp: false,
    monthlyPrice: 950000,
    timeline: [
      { at: "2026-05-20T10:00:00Z", stage: "diajukan" },
      { at: "2026-05-20T11:45:00Z", stage: "disetujui" },
      { at: "2026-06-01T08:30:00Z", stage: "lunas" },
    ],
  },
  {
    id: "BK-DUMMY-05",
    code: "BK-20260510-V01",
    propertySlug: "kost-dparagon-ijen-nirwana",
    propertyName: "D'Paragon Ijen Nirwana",
    city: "Malang",
    roomType: "VIP",
    roomId: "dp-vip",
    roomNumber: "V-01",
    startDate: "2026-05-10",
    status: "active",
    applicantName: "Farhan Ramadhan",
    applicantPhone: "+62 811-9988-7766",
    applicantEmail: "farhan.ramadhan@dummy.ngekos.biz.id",
    createdAt: "2026-05-01T16:00:00Z",
    payDeadlineMin: 1440,
    usesDp: false,
    monthlyPrice: 2600000,
    timeline: [
      { at: "2026-05-01T16:00:00Z", stage: "diajukan" },
      { at: "2026-05-02T09:15:00Z", stage: "disetujui" },
      { at: "2026-05-10T09:00:00Z", stage: "lunas" },
    ],
  },
];

/* ===== 9. REVIEWS PENGHUNI (USER REVIEWS) ===== */
export const dummyUserReviews: UserReview[] = [
  {
    id: "REV-DUMMY-01",
    propertySlug: "kost-dparagon-ijen-nirwana",
    propertyName: "D'Paragon Ijen Nirwana",
    authorName: "I Made Sudiarta",
    mine: true,
    rating: 5,
    at: "2026-09-01",
    editable: true,
    bodyId:
      "Kost sangat nyaman, tenang untuk belajar, AC dingin, dan penjagaan satpam 24 jam membuat merasa aman. Lokasi dekat sekali dengan kampus UB.",
    bodyEn:
      "The boarding house is very comfortable, quiet for studying, cold AC, and 24-hour security makes me feel safe. Very close to UB campus.",
  },
  {
    id: "REV-DUMMY-02",
    propertySlug: "kost-putri-bu-sastro",
    propertyName: "Kost Putri Bu Sastro",
    authorName: "Anisa Rahmawati",
    mine: false,
    rating: 5,
    at: "2026-08-25",
    editable: false,
    bodyId:
      "Ibu kos sangat ramah dan kebersihan dapur bersama selalu terjaga. Dekat kuliner Sigura-gura dan aman untuk mahasiswi.",
    bodyEn:
      "The owner is very kind and shared kitchen cleanliness is well maintained. Close to Sigura-gura food spots and safe for female students.",
  },
];
