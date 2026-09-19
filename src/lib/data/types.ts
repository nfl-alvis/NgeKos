export type Facility =
  | "wifi"
  | "ac"
  | "bathroom-in"
  | "parking"
  | "kitchen"
  | "laundry"
  | "bed"
  | "wardrobe"
  | "desk"
  | "fridge"
  | "hot-water"
  | "cctv"
  | "access-24h";

export type Gender = "mixed" | "male" | "female";

export interface RoomType {
  id: string;
  name: string;
  /** monthly price in IDR */
  pricePerMonth: number;
  available: number;
  total: number;
  sizeM2: number;
}

export interface Property {
  id?: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  city: string;
  district: string;
  address: string;
  gender: Gender;
  /** verified + active -> appears in public listing (PRD v3.6) */
  verified: boolean;
  active: boolean;
  rating: number;
  reviewCount: number;
  /** picsum seed for stable images */
  imageSeed: string;
  facilities: Facility[];
  roomTypes: RoomType[];
  minPrice: number;
  distanceToCampusM: number;
  depositInfo: string;
  depositAmount?: number | null;
  /** owner domain: verification workflow state (admin review queue) */
  verificationStatus: "verified" | "pending" | "rejected";
  verificationNote?: string;
  /** DP policy: if set, tenant pays deposit up front and remainder on approval */
  dpAmount?: number;
  /** subscription limit rule per owner tier */
  maxRooms?: number;
}

/* ===== booking & tenant domain (dummy, mirrors future API shapes) ===== */

export type BookingStatus =
  | "pending"
  | "approved-awaiting-payment"
  | "active"
  | "rejected"
  | "expired"
  | "cancelled";

export interface Booking {
  id: string;
  propertySlug: string;
  propertyName: string;
  city: string;
  roomType: string;
  roomId: string;
  roomNumber: string;
  /** ISO date */
  startDate: string;
  note?: string;
  status: BookingStatus;
  /** tenant-facing contextual copy for rejected/expired/cancelled */
  statusNote?: string;
  /** owner-facing applicant data */
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  createdAt: string;
  /** payment deadline when approved-awaiting-payment (minutes from createdAt) */
  payDeadlineMin: number;
  /** whether this booking uses the DP (deposit) policy */
  usesDp: boolean;
  /** price snapshot */
  monthlyPrice: number;
  /** status timeline: Diajukan -> Disetujui -> Menunggu Bayar -> Lunas */
  timeline: { at: string; stage: "diajukan" | "disetujui" | "menunggu-bayar" | "lunas" }[];
  payments?: { id: string; at: string; amount: number; status: "berhasil" | "gagal" | "pending" }[];
}

export type TenantPaymentStatus = "lunas" | "belum-bayar" | "menunggak";

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  propertySlug: string;
  propertyName: string;
  roomNumber: string;
  /** current month payment status */
  paymentStatus: TenantPaymentStatus;
  joinedAt: string;
  /** monthly rent (IDR) */
  monthlyRent: number;
}

export interface RentalAgreement {
  tenantId: string;
  property: string;
  room: string;
  period: string;
  rent: number;
}

export interface Invoice {
  id: string;
  tenantName: string;
  /** e.g. "Agustus 2026" */
  period: string;
  amount: number;
  status: "lunas" | "belum-lunas";
  dueDate: string;
  paidAt?: string;
}

export type NotificationType = "booking" | "subscription" | "payment";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** ISO timestamp */
  at: string;
  read: boolean;
  /** route to navigate on click */
  linkUrl: string;
}

export type MessageChannel = "telegram" | "email";

export interface Conversation {
  id: string;
  name: string;
  channel: MessageChannel;
  telegramConnected: boolean;
  unread: number;
  messages: {
    id: string;
    from: "owner" | "contact";
    text: string;
    at: string;
    channel: MessageChannel;
  }[];
}

export interface SubscriptionPlan {
  id: "starter" | "professional" | "enterprise";
  name: string;
  pricePerMonth: number;
  maxProperties: number;
  maxRooms: number;
  advancedAnalytics: boolean;
  autoMessages: boolean;
  recommended?: boolean;
}

export interface SubscriptionState {
  status: "trial" | "active" | "grace" | "expired";
  /** trial remaining days for progress bar */
  trialDaysLeft: number;
  trialDaysTotal: number;
  activeUntil: string;
  planId: SubscriptionPlan["id"];
}

export interface OwnerProfile {
  name: string;
  email: string;
  avatarSeed: string;
  joinedAt: string;
}

export interface AdminReviewEntry {
  id: string;
  propertySlug: string;
  propertyName: string;
  city: string;
  ownerName: string;
  ownerEmail: string;
  ownerJoinedAt: string;
  submittedAt: string;
  /** only on history page */
  decidedAt?: string;
  decidedBy?: string;
  decision?: "approved" | "rejected";
  rejectionReason?: string;
}
