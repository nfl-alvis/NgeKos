-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SEEKER', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER', 'VERIFIER', 'FINANCE', 'SUPPORT');

-- CreateEnum
CREATE TYPE "PropertyGender" AS ENUM ('MIXED', 'MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'PENDING', 'VERIFIED', 'REJECTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'APPROVED_AWAITING_PAYMENT', 'ACTIVE', 'REJECTED', 'EXPIRED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'MANUAL');

-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('FACILITY', 'CLEANLINESS', 'SECURITY', 'PAYMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'FLAGGED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING', 'PAYMENT', 'SUBSCRIPTION', 'COMPLAINT', 'ANNOUNCEMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "VerificationDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportTarget" AS ENUM ('PROPERTY', 'USER', 'REVIEW', 'CONTENT');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "birth_place" TEXT,
    "occupation" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'SEEKER',
    "admin_role" "AdminRole",
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" VARCHAR(5) NOT NULL DEFAULT 'id',
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "push_notifications" BOOLEAN NOT NULL DEFAULT true,
    "marketing_notifications" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postal_code" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "gender" "PropertyGender" NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "rejection_note" TEXT,
    "deposit_amount" DECIMAL(14,0),
    "distance_to_campus_m" INTEGER,
    "max_rooms" INTEGER,
    "average_rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name_id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "icon" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_facilities" (
    "property_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,

    CONSTRAINT "property_facilities_pkey" PRIMARY KEY ("property_id","facility_id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_per_month" DECIMAL(14,0) NOT NULL,
    "size_m2" DECIMAL(6,2),
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "room_type_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "floor" TEXT,
    "orientation" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "room_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "profile_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("profile_id","property_id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "applicant_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_type_id" UUID NOT NULL,
    "room_unit_id" UUID,
    "start_date" DATE NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "note" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "status_note" TEXT,
    "monthly_price_snapshot" DECIMAL(14,0) NOT NULL,
    "deposit_snapshot" DECIMAL(14,0),
    "payment_deadline" TIMESTAMPTZ(3),
    "approved_at" TIMESTAMPTZ(3),
    "rejected_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "cancelled_at" TIMESTAMPTZ(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "note" TEXT,
    "actor_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_agreements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID,
    "tenant_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_unit_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "monthly_rent" DECIMAL(14,0) NOT NULL,
    "deposit_amount" DECIMAL(14,0),
    "terms" TEXT,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "terminated_at" TIMESTAMPTZ(3),

    CONSTRAINT "rental_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "agreement_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "issued_at" TIMESTAMPTZ(3),
    "paid_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "recorded_by_id" UUID,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(14,0) NOT NULL,
    "reference" TEXT,
    "proof_path" TEXT,
    "note" TEXT,
    "paid_at" TIMESTAMPTZ(3),
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agreement_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "agreement_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "category" "ComplaintCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "owner_note" TEXT,
    "resolved_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "complaint_id" UUID NOT NULL,
    "status" "ComplaintStatus" NOT NULL,
    "note" TEXT,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_reads" (
    "announcement_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_reads_pkey" PRIMARY KEY ("announcement_id","profile_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link_url" TEXT,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "property_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(3),
    "decided_by_id" UUID,
    "decision" "VerificationDecision",
    "rejection_reason" TEXT,
    "evidence" JSONB,

    CONSTRAINT "property_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID NOT NULL,
    "target_type" "ReportTarget" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title_id" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "excerpt_id" TEXT NOT NULL,
    "excerpt_en" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "content_en" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "cover_path" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" TEXT NOT NULL,
    "question_en" TEXT NOT NULL,
    "answer_id" TEXT NOT NULL,
    "answer_en" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "faq_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popular_cities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image_path" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "popular_cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_phone_key" ON "profiles"("phone");

-- CreateIndex
CREATE INDEX "profiles_role_status_idx" ON "profiles"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "properties_slug_key" ON "properties"("slug");

-- CreateIndex
CREATE INDEX "properties_owner_id_status_idx" ON "properties"("owner_id", "status");

-- CreateIndex
CREATE INDEX "properties_status_city_district_idx" ON "properties"("status", "city", "district");

-- CreateIndex
CREATE INDEX "properties_latitude_longitude_idx" ON "properties"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "property_images_property_id_sort_order_idx" ON "property_images"("property_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "property_images_property_id_storage_path_key" ON "property_images"("property_id", "storage_path");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_key_key" ON "facilities"("key");

-- CreateIndex
CREATE INDEX "property_facilities_facility_id_idx" ON "property_facilities"("facility_id");

-- CreateIndex
CREATE INDEX "room_types_property_id_price_per_month_idx" ON "room_types"("property_id", "price_per_month");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_property_id_name_key" ON "room_types"("property_id", "name");

-- CreateIndex
CREATE INDEX "room_units_property_id_status_idx" ON "room_units"("property_id", "status");

-- CreateIndex
CREATE INDEX "room_units_room_type_id_status_idx" ON "room_units"("room_type_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "room_units_property_id_number_key" ON "room_units"("property_id", "number");

-- CreateIndex
CREATE INDEX "favorites_property_id_idx" ON "favorites"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_code_key" ON "bookings"("code");

-- CreateIndex
CREATE INDEX "bookings_applicant_id_status_created_at_idx" ON "bookings"("applicant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "bookings_property_id_status_created_at_idx" ON "bookings"("property_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "bookings_room_unit_id_status_idx" ON "bookings"("room_unit_id", "status");

-- CreateIndex
CREATE INDEX "booking_status_history_booking_id_created_at_idx" ON "booking_status_history"("booking_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rental_agreements_booking_id_key" ON "rental_agreements"("booking_id");

-- CreateIndex
CREATE INDEX "rental_agreements_tenant_id_status_idx" ON "rental_agreements"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "rental_agreements_property_id_status_idx" ON "rental_agreements"("property_id", "status");

-- CreateIndex
CREATE INDEX "rental_agreements_room_unit_id_status_idx" ON "rental_agreements"("room_unit_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_code_key" ON "invoices"("code");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_status_due_date_idx" ON "invoices"("tenant_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "invoices_property_id_status_due_date_idx" ON "invoices"("property_id", "status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_agreement_id_period_start_key" ON "invoices"("agreement_id", "period_start");

-- CreateIndex
CREATE INDEX "payments_invoice_id_status_idx" ON "payments"("invoice_id", "status");

-- CreateIndex
CREATE INDEX "payments_reference_idx" ON "payments"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_agreement_id_key" ON "reviews"("agreement_id");

-- CreateIndex
CREATE INDEX "reviews_property_id_status_created_at_idx" ON "reviews"("property_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "reviews_author_id_created_at_idx" ON "reviews"("author_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_code_key" ON "complaints"("code");

-- CreateIndex
CREATE INDEX "complaints_tenant_id_status_created_at_idx" ON "complaints"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "complaints_property_id_status_created_at_idx" ON "complaints"("property_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "complaint_history_complaint_id_created_at_idx" ON "complaint_history"("complaint_id", "created_at");

-- CreateIndex
CREATE INDEX "announcements_property_id_published_at_idx" ON "announcements"("property_id", "published_at");

-- CreateIndex
CREATE INDEX "announcement_reads_profile_id_idx" ON "announcement_reads"("profile_id");

-- CreateIndex
CREATE INDEX "notifications_profile_id_read_at_created_at_idx" ON "notifications"("profile_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "conversations_owner_id_updated_at_idx" ON "conversations"("owner_id", "updated_at");

-- CreateIndex
CREATE INDEX "conversations_contact_id_updated_at_idx" ON "conversations"("contact_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_owner_id_contact_id_property_id_key" ON "conversations"("owner_id", "contact_id", "property_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "property_verifications_decision_submitted_at_idx" ON "property_verifications"("decision", "submitted_at");

-- CreateIndex
CREATE INDEX "property_verifications_property_id_submitted_at_idx" ON "property_verifications"("property_id", "submitted_at");

-- CreateIndex
CREATE INDEX "reports_status_target_type_created_at_idx" ON "reports"("status", "target_type", "created_at");

-- CreateIndex
CREATE INDEX "reports_target_type_target_id_idx" ON "reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_status_published_at_idx" ON "blog_posts"("status", "published_at");

-- CreateIndex
CREATE INDEX "blog_posts_category_status_idx" ON "blog_posts"("category", "status");

-- CreateIndex
CREATE INDEX "faq_entries_active_category_sort_order_idx" ON "faq_entries"("active", "category", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "popular_cities_slug_key" ON "popular_cities"("slug");

-- CreateIndex
CREATE INDEX "popular_cities_active_sort_order_idx" ON "popular_cities"("active", "sort_order");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_facilities" ADD CONSTRAINT "property_facilities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_facilities" ADD CONSTRAINT "property_facilities_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_units" ADD CONSTRAINT "room_units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_units" ADD CONSTRAINT "room_units_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_unit_id_fkey" FOREIGN KEY ("room_unit_id") REFERENCES "room_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_agreements" ADD CONSTRAINT "rental_agreements_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_agreements" ADD CONSTRAINT "rental_agreements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_agreements" ADD CONSTRAINT "rental_agreements_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_agreements" ADD CONSTRAINT "rental_agreements_room_unit_id_fkey" FOREIGN KEY ("room_unit_id") REFERENCES "room_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "rental_agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "rental_agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "rental_agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_history" ADD CONSTRAINT "complaint_history_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_history" ADD CONSTRAINT "complaint_history_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_verifications" ADD CONSTRAINT "property_verifications_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_verifications" ADD CONSTRAINT "property_verifications_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Supabase Auth owns credentials; public.profiles mirrors identity and application role.
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_auth_user_fkey"
  FOREIGN KEY ("id") REFERENCES auth.users("id") ON DELETE CASCADE;

-- Domain invariants that Prisma cannot express directly.
ALTER TABLE "properties"
  ADD CONSTRAINT "properties_rating_check" CHECK ("average_rating" >= 0 AND "average_rating" <= 5),
  ADD CONSTRAINT "properties_review_count_check" CHECK ("review_count" >= 0),
  ADD CONSTRAINT "properties_deposit_check" CHECK ("deposit_amount" IS NULL OR "deposit_amount" >= 0),
  ADD CONSTRAINT "properties_latitude_check" CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "properties_longitude_check" CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);
ALTER TABLE "room_types"
  ADD CONSTRAINT "room_types_price_check" CHECK ("price_per_month" >= 0),
  ADD CONSTRAINT "room_types_size_check" CHECK ("size_m2" IS NULL OR "size_m2" > 0),
  ADD CONSTRAINT "room_types_capacity_check" CHECK ("capacity" > 0);
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_duration_check" CHECK ("duration_months" BETWEEN 1 AND 36),
  ADD CONSTRAINT "bookings_price_check" CHECK ("monthly_price_snapshot" >= 0),
  ADD CONSTRAINT "bookings_deposit_check" CHECK ("deposit_snapshot" IS NULL OR "deposit_snapshot" >= 0);
ALTER TABLE "rental_agreements"
  ADD CONSTRAINT "rental_agreements_period_check" CHECK ("end_date" > "start_date"),
  ADD CONSTRAINT "rental_agreements_rent_check" CHECK ("monthly_rent" >= 0),
  ADD CONSTRAINT "rental_agreements_deposit_check" CHECK ("deposit_amount" IS NULL OR "deposit_amount" >= 0);
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_period_check" CHECK ("period_end" >= "period_start"),
  ADD CONSTRAINT "invoices_amount_check" CHECK ("amount" >= 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_check" CHECK ("amount" > 0);
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

CREATE UNIQUE INDEX "property_images_single_cover_idx"
  ON "property_images" ("property_id") WHERE "is_cover" = true;
CREATE UNIQUE INDEX "rental_agreements_one_active_room_idx"
  ON "rental_agreements" ("room_unit_id") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "profiles_email_lower_key" ON "profiles" (lower("email"));

-- Raw SQL inserts (including the auth trigger) need a timestamp default.
ALTER TABLE "profiles" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "properties" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "room_types" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "room_units" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "bookings" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "rental_agreements" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "invoices" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "payments" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "reviews" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "complaints" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "conversations" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "reports" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "blog_posts" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "faq_entries" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "popular_cities" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_role public."UserRole";
BEGIN
  requested_role := CASE
    WHEN lower(COALESCE(new.raw_user_meta_data ->> 'role', '')) = 'owner'
      THEN 'OWNER'::public."UserRole"
    ELSE 'SEEKER'::public."UserRole"
  END;

  INSERT INTO public.profiles (id, email, full_name, phone, role, locale, updated_at)
  VALUES (
    new.id,
    lower(COALESCE(new.email, '')),
    COALESCE(NULLIF(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(COALESCE(new.email, 'user'), '@', 1)),
    NULLIF(trim(new.raw_user_meta_data ->> 'phone'), ''),
    requested_role,
    CASE WHEN new.raw_user_meta_data ->> 'locale' = 'en' THEN 'en' ELSE 'id' END,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = now();

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- The application uses Prisma as a server-side DAL. Deny direct Data API access by
-- default; Storage has narrowly scoped policies below.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "properties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "facilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_facilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "room_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "room_units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rental_agreements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "complaints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "complaint_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "announcement_reads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "faq_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "popular_cities" ENABLE ROW LEVEL SECURITY;

-- Public property images. Every authenticated user can only mutate objects inside
-- a top-level folder named after their own auth.uid(). Ownership is rechecked on
-- update/delete, so paths cannot be used to take over another user's file.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "property_images_public_read" ON storage.objects;
CREATE POLICY "property_images_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS "property_images_owner_insert" ON storage.objects;
CREATE POLICY "property_images_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

DROP POLICY IF EXISTS "property_images_owner_update" ON storage.objects;
CREATE POLICY "property_images_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-images' AND owner_id = (SELECT auth.uid()::text))
WITH CHECK (
  bucket_id = 'property-images'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

DROP POLICY IF EXISTS "property_images_owner_delete" ON storage.objects;
CREATE POLICY "property_images_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-images' AND owner_id = (SELECT auth.uid()::text));

