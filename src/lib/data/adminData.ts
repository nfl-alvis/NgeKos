/* ===== dataset panel admin — akun, transaksi Midtrans, refund, laporan, moderasi, konten, audit ===== */

export interface OwnerAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joinedAt: string;
  tier: "basic" | "premium";
  propertyCount: number;
  /** status awal; penangguhan sesi menambah via adminOpsStore */
  status: "aktif" | "ditangguhkan" | "menunggu";
}

export interface SeekerAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joinedAt: string;
  bookingCount: number;
  status: "aktif" | "diblokir";
}

export type AdminRole = "super" | "verifikator" | "keuangan" | "dukungan";

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  lastActive: string;
  status: "aktif" | "nonaktif";
}

export type TxMethod = "va-bca" | "va-bni" | "qris" | "gopay";
export type TxStatus = "settlement" | "pending" | "expired" | "cancel" | "refund";

export interface PlatformTransaction {
  id: string;
  bookingId: string;
  propertyName: string;
  payer: string;
  method: TxMethod;
  amount: number;
  /** komisi platform (potongan layanan) */
  fee: number;
  status: TxStatus;
  at: string;
}

export interface RefundRequest {
  id: string;
  bookingId: string;
  propertyName: string;
  user: string;
  amount: number;
  reasonId: string;
  reasonEn: string;
  requestedAt: string;
  status: "diajukan" | "disetujui" | "ditolak";
}

export type ReportType = "properti" | "pengguna" | "review" | "konten";

export interface UserReport {
  id: string;
  type: ReportType;
  target: string;
  reporter: string;
  reasonId: string;
  reasonEn: string;
  at: string;
  status: "baru" | "selesai" | "diabaikan";
}

export interface AdminReviewItem {
  id: string;
  authorName: string;
  propertyName: string;
  rating: number;
  bodyId: string;
  bodyEn: string;
  at: string;
  flagged: boolean;
}

export interface ContentBanner {
  id: string;
  titleId: string;
  titleEn: string;
  position: "hero" | "list";
  status: "tayang" | "jadwal" | "habis";
  from: string;
  to: string;
}

export interface CityItem {
  name: string;
  propertyCount: number;
  seekerCount: number;
  status: "tayang" | "disembunyikan";
}

export interface FaqGroupItem {
  key: string;
  itemCount: number;
  updatedAt: string;
}

export interface PolicyDoc {
  slug: string;
  version: string;
  updatedAt: string;
  status: "tayang" | "draft";
}

export type AuditType =
  | "verify.approve"
  | "verify.reject"
  | "property.disable"
  | "property.enable"
  | "property.delete"
  | "owner.suspend"
  | "owner.reactivate"
  | "user.ban"
  | "user.unban"
  | "refund.approve"
  | "refund.reject"
  | "report.resolve"
  | "report.dismiss"
  | "review.hide"
  | "review.show"
  | "notify.send"
  | "admin.role";

export interface AuditEntry {
  id: string;
  /** ISO timestamp */
  at: string;
  actor: string;
  type: AuditType;
  /** objek tindakan: nama/ID target */
  target: string;
}

export interface BroadcastItem {
  id: string;
  target: "owner" | "seeker" | "semua";
  title: string;
  body: string;
  sentAt: string;
  recipients: number;
}

/* ===== akun ===== */

export const ownerAccounts: OwnerAccount[] = [
  { id: "o-1", name: "Ratri Wulandari", email: "ratri.wulandari@gmail.com", phone: "+62 812-1102-3345", city: "Yogyakarta", joinedAt: "2025-02-11", tier: "premium", propertyCount: 4, status: "aktif" },
  { id: "o-2", name: "Hendra Wijaya", email: "hendra.wijaya@gmail.com", phone: "+62 857-2233-8890", city: "Malang", joinedAt: "2024-11-03", tier: "basic", propertyCount: 2, status: "aktif" },
  { id: "o-3", name: "Dewi Anggraini", email: "dewi.anggraini@gmail.com", phone: "+62 813-5566-1204", city: "Bandung", joinedAt: "2025-05-27", tier: "premium", propertyCount: 3, status: "aktif" },
  { id: "o-4", name: "Bagas Nur Hidayat", email: "bagas.nurhidayat@gmail.com", phone: "+62 821-7788-4510", city: "Surabaya", joinedAt: "2026-01-14", tier: "basic", propertyCount: 1, status: "aktif" },
  { id: "o-5", name: "Lilis Suryani", email: "lilis.suryani@yahoo.com", phone: "+62 819-3344-7781", city: "Semarang", joinedAt: "2025-09-08", tier: "basic", propertyCount: 2, status: "aktif" },
  { id: "o-6", name: "Tommy Alexandro", email: "tommy.alexandro@gmail.com", phone: "+62 811-9090-2233", city: "Jakarta", joinedAt: "2025-12-01", tier: "basic", propertyCount: 1, status: "ditangguhkan" },
  { id: "o-7", name: "Nia Kurniasih", email: "nia.kurniasih@gmail.com", phone: "+62 856-1234-8877", city: "Bandung", joinedAt: "2026-02-19", tier: "premium", propertyCount: 2, status: "aktif" },
  { id: "o-8", name: "Yusuf Maulana", email: "yufsmaulana@outlook.com", phone: "+62 812-6677-3390", city: "Surakarta", joinedAt: "2026-08-24", tier: "basic", propertyCount: 1, status: "menunggu" },
];

export const seekerAccounts: SeekerAccount[] = [
  { id: "u-1", name: "I made Sudiarta", email: "imade.sudiarta@gmail.com", phone: "+62 812-3456-7801", city: "Bandung", joinedAt: "2025-07-19", bookingCount: 2, status: "aktif" },
  { id: "u-2", name: "Anindya Paramitha", email: "anindya.paramitha@gmail.com", phone: "+62 813-8890-1145", city: "Yogyakarta", joinedAt: "2025-10-02", bookingCount: 1, status: "aktif" },
  { id: "u-3", name: "Dimas Aryasatya", email: "dimas.aryasatya@gmail.com", phone: "+62 812-9907-2148", city: "Bandung", joinedAt: "2026-03-11", bookingCount: 1, status: "aktif" },
  { id: "u-4", name: "Kevin Hanjaya", email: "kevin.hanjaya@outlook.com", phone: "+62 813-2245-8801", city: "Jakarta", joinedAt: "2026-04-06", bookingCount: 1, status: "aktif" },
  { id: "u-5", name: "Sarah Amelia Pohan", email: "sarah.amelia@gmail.com", phone: "+62 812-6674-0912", city: "Surabaya", joinedAt: "2026-04-15", bookingCount: 2, status: "aktif" },
  { id: "u-6", name: "Reza Fahlevi", email: "reza.fahlevi99@gmail.com", phone: "+62 857-4412-7709", city: "Malang", joinedAt: "2026-06-27", bookingCount: 3, status: "diblokir" },
];

export const adminAccounts: AdminAccount[] = [
  { id: "a-1", name: "Bayu Pratama", email: "bayu.pratama@ngekost.id", role: "super", lastActive: "2026-09-03T08:12:00", status: "aktif" },
  { id: "a-2", name: "Sinta Maharani", email: "sinta.maharani@ngekost.id", role: "verifikator", lastActive: "2026-09-02T16:44:00", status: "aktif" },
  { id: "a-3", name: "Rizky Ananda", email: "rizky.ananda@ngekost.id", role: "keuangan", lastActive: "2026-09-02T11:20:00", status: "aktif" },
  { id: "a-4", name: "Putri Ayu Lestari", email: "putri.ayu@ngekost.id", role: "dukungan", lastActive: "2026-08-28T09:05:00", status: "nonaktif" },
];

/** email admin yang sedang login (identitas penulis audit sesi) */
export const CURRENT_ADMIN_EMAIL = "bayu.pratama@ngekost.id";

/* ===== transaksi pembayaran (Midtrans) ===== */

export const platformTransactions: PlatformTransaction[] = [
  { id: "VT-8841", bookingId: "BK-1247", propertyName: "Kost Griya Cemara", payer: "Dimas Aryasatya", method: "va-bca", amount: 1650000, fee: 82500, status: "settlement", at: "2026-09-03T07:41:00" },
  { id: "VT-8840", bookingId: "BK-1245", propertyName: "Kost Kenanga", payer: "Citra Lestari Dewi", method: "qris", amount: 1350000, fee: 67500, status: "settlement", at: "2026-09-03T06:12:00" },
  { id: "VT-8839", bookingId: "BK-1244", propertyName: "Kost Putri Mawar", payer: "Anindya Paramitha", method: "gopay", amount: 1250000, fee: 62500, status: "pending", at: "2026-09-02T21:33:00" },
  { id: "VT-8837", bookingId: "BK-1242", propertyName: "Kost Pangeran Diponegoro", payer: "Kevin Hanjaya", method: "va-bni", amount: 3250000, fee: 162500, status: "settlement", at: "2026-09-02T15:08:00" },
  { id: "VT-8835", bookingId: "BK-1240", propertyName: "Kost Al-Amin", payer: "Sarah Amelia Pohan", method: "va-bca", amount: 1100000, fee: 55000, status: "expired", at: "2026-09-01T19:57:00" },
  { id: "VT-8832", bookingId: "BK-1236", propertyName: "Kost Ratna Darmo", payer: "Reza Fahlevi", method: "qris", amount: 1400000, fee: 70000, status: "cancel", at: "2026-09-01T12:26:00" },
  { id: "VT-8830", bookingId: "BK-1233", propertyName: "Kost Bougenville", payer: "Muhammad Iqbal", method: "va-bca", amount: 850000, fee: 42500, status: "settlement", at: "2026-08-31T09:14:00" },
  { id: "VT-8828", bookingId: "BK-1230", propertyName: "Kost Griya Cemara", payer: "I made Sudiarta", method: "gopay", amount: 1200000, fee: 60000, status: "settlement", at: "2026-08-30T20:47:00" },
  { id: "VT-8825", bookingId: "BK-1227", propertyName: "Kost Sara Theresa", payer: "Dinda Kartika", method: "va-bni", amount: 1750000, fee: 87500, status: "refund", at: "2026-08-29T10:02:00" },
  { id: "VT-8823", bookingId: "BK-1224", propertyName: "Kost Mutiara Gading", payer: "Bayu Anggara", method: "qris", amount: 1550000, fee: 77500, status: "settlement", at: "2026-08-28T17:35:00" },
  { id: "VT-8820", bookingId: "BK-1221", propertyName: "Kost Kenanga", payer: "Bagus Setiawan", method: "va-bca", amount: 1050000, fee: 52500, status: "settlement", at: "2026-08-27T08:21:00" },
  { id: "VT-8817", bookingId: "BK-1218", propertyName: "Kost Zinnia", payer: "Nadia Safitri", method: "gopay", amount: 950000, fee: 47500, status: "pending", at: "2026-08-26T22:10:00" },
];

export const monthlyRevenue: { monthId: string; gross: number; fee: number }[] = [
  { monthId: "m1", gross: 41_200_000, fee: 2_060_000 },
  { monthId: "m2", gross: 48_600_000, fee: 2_430_000 },
  { monthId: "m3", gross: 52_100_000, fee: 2_605_000 },
  { monthId: "m4", gross: 61_400_000, fee: 3_070_000 },
  { monthId: "m5", gross: 57_800_000, fee: 2_890_000 },
  { monthId: "m6", gross: 66_300_000, fee: 3_315_000 },
  { monthId: "m7", gross: 74_900_000, fee: 3_745_000 },
  { monthId: "m8", gross: 71_200_000, fee: 3_560_000 },
  { monthId: "m9", gross: 82_500_000, fee: 4_125_000 },
  { monthId: "m10", gross: 88_100_000, fee: 4_405_000 },
  { monthId: "m11", gross: 95_600_000, fee: 4_780_000 },
  { monthId: "m12", gross: 104_300_000, fee: 5_215_000 },
];

/* ===== refund & sengketa ===== */

export const refundRequests: RefundRequest[] = [
  { id: "RD-114", bookingId: "BK-1225", propertyName: "Kost Sara Theresa", user: "Dinda Kartika", amount: 1750000, reasonId: "Kamar tidak sesuai foto, AC tidak berfungsi saat check-in.", reasonEn: "Room does not match photos, AC not working at check-in.", requestedAt: "2026-09-01", status: "diajukan" },
  { id: "RD-113", bookingId: "BK-1219", propertyName: "Kost Ratna Darmo", user: "Reza Fahlevi", amount: 1400000, reasonId: "Owner membatalkan sepihak 2 hari sebelum masuk.", reasonEn: "Owner cancelled unilaterally 2 days before move-in.", requestedAt: "2026-08-30", status: "diajukan" },
  { id: "RD-112", bookingId: "BK-1214", propertyName: "Kost Al-Amin", user: "Sarah Amelia Pohan", amount: 550000, reasonId: "DP sudah dibayar tapi kamar diberikan ke orang lain.", reasonEn: "DP paid but the room was given to someone else.", requestedAt: "2026-08-28", status: "diajukan" },
  { id: "RD-110", bookingId: "BK-1202", propertyName: "Kost Mutiara Gading", user: "Bayu Anggara", amount: 1550000, reasonId: "Salah bayar dua kali untuk booking yang sama.", reasonEn: "Paid twice for the same booking.", requestedAt: "2026-08-21", status: "disetujui" },
  { id: "RD-108", bookingId: "BK-1193", propertyName: "Kost Griya Cemara", user: "Kevin Hanjaya", amount: 500000, reasonId: "Ingin mundur karena pindah kota, sudah lewat batas pembatalan gratis.", reasonEn: "Wants to withdraw due to moving cities, past the free cancellation window.", requestedAt: "2026-08-12", status: "ditolak" },
];

/* ===== laporan pengguna ===== */

export const userReports: UserReport[] = [
  { id: "RP-221", type: "properti", target: "Kost Ratna Darmo · Surabaya", reporter: "Reza Fahlevi", reasonId: "FakePrice", reasonEn: "Fake price", at: "2026-09-02", status: "baru" },
  { id: "RP-220", type: "pengguna", target: "Reza Fahlevi (u-6)", reporter: "Lilis Suryani", reasonId: "SpamChat", reasonEn: "Chat spam", at: "2026-09-02", status: "baru" },
  { id: "RP-219", type: "review", target: "Ulasan rv-7 · Kost Zinnia", reporter: "Nia Kurniasih", reasonId: "Abusive", reasonEn: "Abusive content", at: "2026-09-01", status: "baru" },
  { id: "RP-216", type: "properti", target: "Kost Melati Baru · Depok", reporter: "Anindya Paramitha", reasonId: "FakeListing", reasonEn: "Fake listing", at: "2026-08-27", status: "selesai" },
  { id: "RP-214", type: "konten", target: "Banner promo halaman home", reporter: "Hendra Wijaya", reasonId: "MisleadingPromo", reasonEn: "Misleading promo", at: "2026-08-24", status: "diabaikan" },
  { id: "RP-211", type: "pengguna", target: "Dinda Kartika", reporter: "Yusuf Maulana", reasonId: "FakeIdentity", reasonEn: "Fake identity", at: "2026-08-20", status: "selesai" },
];

/* ===== moderasi review ===== */

export const adminReviewItems: AdminReviewItem[] = [
  { id: "rv-1", authorName: "Anindya P.", propertyName: "Kost Griya Cemara", rating: 5, bodyId: "Kamar bersih, air panas lancar, pemilik responsif. recommended untuk mahasiswa.", bodyEn: "Clean room, hot water works well, responsive owner. Recommended for students.", at: "2026-09-01", flagged: false },
  { id: "rv-2", authorName: "Kevin H.", propertyName: "Kost Kenanga", rating: 4, bodyId: "Lokasi strategis dan parkir luas. Dinding kamar agak tipis saat malam.", bodyEn: "Strategic location and wide parking. Room walls are a bit thin at night.", at: "2026-08-24", flagged: false },
  { id: "rv-3", authorName: "Sarah A.", propertyName: "Kost Al-Amin", rating: 5, bodyId: "WiFi stabil untuk kerja remote, dapur bersama selalu bersih. Betah tinggal di sini.", bodyEn: "Stable WiFi for remote work, shared kitchen always clean. Feels great living here.", at: "2026-08-17", flagged: false },
  { id: "rv-7", authorName: "akun_baru_912", propertyName: "Kost Zinnia", rating: 1, bodyId: "BUANG BUANG PROMO RODI GAP — cek profil saya buat linknya!!!", bodyEn: "SPAM SPAM PROMO — check my profile for the link!!!", at: "2026-09-02", flagged: true },
  { id: "rv-8", authorName: "Hendra W.", propertyName: "Kost Melati Baru", rating: 5, bodyId: "Review dari pemilik sendiri, 5 bintang semua dalam 1 malam.", bodyEn: "Self-review from the owner, all 5 stars within one night.", at: "2026-08-31", flagged: true },
  { id: "rv-9", authorName: "Citra L.", propertyName: "Kost Kenanga", rating: 4, bodyId: "Pengelola ramah, tapi harga naik mendadak di tengah kontrak.", bodyEn: "Friendly manager, but price spiked mid-contract.", at: "2026-08-29", flagged: false },
];

/* ===== konten ===== */

export const contentBanners: ContentBanner[] = [
  { id: "bn-1", titleId: "Diskon biaya admin s.d. akhir September", titleEn: "Admin-fee discount until end of September", position: "hero", status: "tayang", from: "2026-09-01", to: "2026-09-30" },
  { id: "bn-2", titleId: "Kost putri baru di kawasan UGM", titleEn: "New female kosts near UGM", position: "list", status: "tayang", from: "2026-08-25", to: "2026-09-10" },
  { id: "bn-3", titleId: "Kemerdekaan: cashback booking 7 Agustus", titleEn: "Independence: 7-Aug booking cashback", position: "hero", status: "jadwal", from: "2026-08-01", to: "2026-08-17" },
];

export const popularCities: CityItem[] = [
  { name: "Bandung", propertyCount: 128, seekerCount: 3410, status: "tayang" },
  { name: "Yogyakarta", propertyCount: 164, seekerCount: 4120, status: "tayang" },
  { name: "Jakarta", propertyCount: 97, seekerCount: 2860, status: "tayang" },
  { name: "Surabaya", propertyCount: 63, seekerCount: 1740, status: "tayang" },
  { name: "Malang", propertyCount: 58, seekerCount: 1520, status: "tayang" },
  { name: "Depok", propertyCount: 12, seekerCount: 210, status: "disembunyikan" },
];

export const faqGroups: FaqGroupItem[] = [
  { key: "groupBooking", itemCount: 5, updatedAt: "2026-08-12" },
  { key: "groupPayment", itemCount: 6, updatedAt: "2026-08-30" },
  { key: "groupOwner", itemCount: 4, updatedAt: "2026-07-22" },
];

export const policyDocs: PolicyDoc[] = [
  { slug: "privacy", version: "v2.3", updatedAt: "2026-06-01", status: "tayang" },
  { slug: "terms", version: "v2.1", updatedAt: "2026-05-14", status: "tayang" },
  { slug: "refund", version: "v1.4", updatedAt: "2026-08-05", status: "tayang" },
  { slug: "verification", version: "v1.0", updatedAt: "2026-09-01", status: "draft" },
];

/* ===== riwayat broadcast (seed; kiriman sesi ini menambah via store) ===== */

export const broadcastHistory: BroadcastItem[] = [
  { id: "bc-9", target: "owner", title: "Pemeliharaan sistem Minggu 02.00-04.00 WIB", body: "Dashboard owner tidak dapat diakses selama jendela pemeliharaan.", sentAt: "2026-08-29T10:00:00", recipients: 812 },
  { id: "bc-8", target: "seeker", title: "Gratis biaya admin selama Agustus", body: "Kode promo otomatis dipakai di halaman pembayaran.", sentAt: "2026-08-01T08:00:00", recipients: 12440 },
];

/* ===== audit log (seed; keputusan sesi ini menambah via store) ===== */

export const auditLogSeed: AuditEntry[] = [
  { id: "ad-41", at: "2026-09-03T07:18:00", actor: "Bayu Pratama", type: "verify.approve", target: "VR-029 · Kost Bougenville" },
  { id: "ad-40", at: "2026-09-02T16:40:00", actor: "Sinta Maharani", type: "review.hide", target: "rv-7 · Kost Zinnia" },
  { id: "ad-39", at: "2026-09-02T14:22:00", actor: "Bayu Pratama", type: "report.resolve", target: "RP-211 · Dinda Kartika" },
  { id: "ad-38", at: "2026-09-01T19:05:00", actor: "Putri Ayu Lestari", type: "property.disable", target: "Kost Melati Baru" },
  { id: "ad-37", at: "2026-08-31T09:50:00", actor: "Sinta Maharani", type: "verify.reject", target: "VR-028 · Kost Zinnia" },
  { id: "ad-36", at: "2026-08-30T13:27:00", actor: "Rizky Ananda", type: "refund.approve", target: "RD-110 · Rp1.550.000" },
  { id: "ad-35", at: "2026-08-29T10:02:00", actor: "Bayu Pratama", type: "notify.send", target: "bc-9 · owner" },
  { id: "ad-34", at: "2026-08-28T08:44:00", actor: "Sinta Maharani", type: "owner.suspend", target: "Tommy Alexandro" },
  { id: "ad-33", at: "2026-08-26T15:10:00", actor: "Putri Ayu Lestari", type: "user.ban", target: "Reza Fahlevi" },
  { id: "ad-32", at: "2026-08-24T11:36:00", actor: "Rizky Ananda", type: "refund.reject", target: "RD-108 · Rp500.000" },
];
