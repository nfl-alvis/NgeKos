/* ===== dataset panel admin - akun, transaksi Midtrans, refund, laporan, moderasi, konten, audit ===== */

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

export const ownerAccounts: OwnerAccount[] = [];

export const seekerAccounts: SeekerAccount[] = [];

export const adminAccounts: AdminAccount[] = [
  { id: "a-1", name: "Bayu Pratama", email: "admin@ngekost.id", role: "super", lastActive: new Date().toISOString(), status: "aktif" },
];

/** email admin yang sedang login (identitas penulis audit sesi) */
export const CURRENT_ADMIN_EMAIL = "admin@ngekost.id";

/* ===== transaksi pembayaran (Midtrans) ===== */

export const platformTransactions: PlatformTransaction[] = [];

export const monthlyRevenue: { monthId: string; gross: number; fee: number }[] = [];

/* ===== refund & sengketa ===== */

export const refundRequests: RefundRequest[] = [];

/* ===== laporan pengguna ===== */

export const userReports: UserReport[] = [];

/* ===== moderasi review ===== */

export const adminReviewItems: AdminReviewItem[] = [];

/* ===== konten ===== */

export const contentBanners: ContentBanner[] = [
  { id: "bn-1", titleId: "Diskon biaya admin s.d. akhir bulan", titleEn: "Admin-fee discount until end of month", position: "hero", status: "tayang", from: "2026-09-01", to: "2026-09-30" },
  { id: "bn-2", titleId: "Kost putri baru di kawasan kampus", titleEn: "New female kosts near campus", position: "list", status: "tayang", from: "2026-08-25", to: "2026-09-10" },
];

export const popularCities: CityItem[] = [
  { name: "Bandung", propertyCount: 12, seekerCount: 340, status: "tayang" },
  { name: "Yogyakarta", propertyCount: 16, seekerCount: 410, status: "tayang" },
  { name: "Jakarta", propertyCount: 10, seekerCount: 280, status: "tayang" },
  { name: "Surabaya", propertyCount: 6, seekerCount: 170, status: "tayang" },
  { name: "Malang", propertyCount: 5, seekerCount: 150, status: "tayang" },
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

export const broadcastHistory: BroadcastItem[] = [];

/* ===== audit log (seed; keputusan sesi ini menambah via store) ===== */

export const auditLogSeed: AuditEntry[] = [];
