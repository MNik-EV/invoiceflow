-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'LUNCH_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "LunchRequestStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('INVOICE', 'PAYMENT_PROOF', 'FOOD_IMAGE');

-- CreateEnum
CREATE TYPE "StorageStatus" AS ENUM ('STAGED', 'AVAILABLE', 'STORAGE_ERROR', 'QUARANTINED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "username" VARCHAR(80) NOT NULL,
    "normalized_username" VARCHAR(80) NOT NULL,
    "email" VARCHAR(254),
    "normalized_email" VARCHAR(254),
    "phone" VARCHAR(20),
    "password_hash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "bank_card_number_encrypted" TEXT,
    "bank_card_last4" CHAR(4),
    "iban_encrypted" TEXT,
    "encryption_key_id" VARCHAR(64),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(80) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lunch_requests" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "lunch_date" DATE NOT NULL,
    "invoice_amount" BIGINT NOT NULL,
    "calculated_amount" BIGINT,
    "allowance_per_participant" BIGINT,
    "approved_participant_count" INTEGER,
    "status" "LunchRequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "description" VARCHAR(2000),
    "rejection_reason" VARCHAR(1000),
    "duplicate_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lunch_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lunch_participants" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lunch_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "storage_status" "StorageStatus" NOT NULL DEFAULT 'STAGED',
    "storage_key" VARCHAR(600) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "media_type" VARCHAR(100) NOT NULL,
    "byte_size" BIGINT NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "uploaded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "paid_by" UUID NOT NULL,
    "paid_on" DATE NOT NULL,
    "tracking_code" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "value" JSONB NOT NULL,
    "value_type" VARCHAR(40) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setting_revisions" (
    "id" UUID NOT NULL,
    "setting_id" UUID NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setting_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_status_history" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "from_status" "LunchRequestStatus",
    "to_status" "LunchRequestStatus" NOT NULL,
    "changed_by" UUID NOT NULL,
    "reason" VARCHAR(1000),
    "metadata" JSONB,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entity" VARCHAR(100) NOT NULL,
    "entity_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "correlation_id" VARCHAR(100) NOT NULL,
    "ip_hash" CHAR(64),
    "timestamp" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_normalized_username_key" ON "users"("normalized_username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_normalized_email_key" ON "users"("normalized_email");

-- CreateIndex
CREATE INDEX "users_role_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_expiry_idx" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "sessions_cleanup_idx" ON "sessions"("expires_at", "revoked_at");

-- CreateIndex
CREATE INDEX "external_identities_user_idx" ON "external_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_identities_provider_subject_key" ON "external_identities"("provider", "subject");

-- CreateIndex
CREATE INDEX "lunch_requests_status_date_idx" ON "lunch_requests"("status", "lunch_date" DESC);

-- CreateIndex
CREATE INDEX "lunch_requests_creator_date_idx" ON "lunch_requests"("creator_id", "lunch_date" DESC);

-- CreateIndex
CREATE INDEX "lunch_requests_date_idx" ON "lunch_requests"("lunch_date");

-- CreateIndex
CREATE INDEX "lunch_participants_user_request_idx" ON "lunch_participants"("user_id", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "lunch_participants_request_user_key" ON "lunch_participants"("request_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storage_key_key" ON "attachments"("storage_key");

-- CreateIndex
CREATE INDEX "attachments_request_type_status_idx" ON "attachments"("request_id", "type", "storage_status");

-- CreateIndex
CREATE INDEX "attachments_sha256_idx" ON "attachments"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "payments_request_id_key" ON "payments"("request_id");

-- CreateIndex
CREATE INDEX "payments_paid_on_idx" ON "payments"("paid_on");

-- CreateIndex
CREATE INDEX "payments_tracking_code_idx" ON "payments"("tracking_code");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "setting_revisions_setting_date_idx" ON "setting_revisions"("setting_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "request_status_history_request_date_idx" ON "request_status_history"("request_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "request_status_history_actor_date_idx" ON "request_status_history"("changed_by", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_date_idx" ON "audit_logs"("entity", "entity_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_user_date_idx" ON "audit_logs"("user_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_date_idx" ON "audit_logs"("action", "timestamp" DESC);

CREATE TABLE "auth_throttles" (
    "id" UUID NOT NULL,
    "key_hash" CHAR(64) NOT NULL,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "window_started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "auth_throttles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_throttles_key_hash_key" ON "auth_throttles"("key_hash");
CREATE INDEX "auth_throttles_cleanup_idx" ON "auth_throttles"("updated_at");
ALTER TABLE "auth_throttles" ADD CONSTRAINT "auth_throttles_failure_count_nonnegative" CHECK ("failure_count" >= 0);

-- Domain integrity checks that Prisma cannot currently express in schema.prisma.
ALTER TABLE "lunch_requests"
  ADD CONSTRAINT "lunch_requests_invoice_amount_positive" CHECK ("invoice_amount" > 0),
  ADD CONSTRAINT "lunch_requests_calculated_amount_nonnegative" CHECK ("calculated_amount" IS NULL OR "calculated_amount" >= 0),
  ADD CONSTRAINT "lunch_requests_allowance_positive" CHECK ("allowance_per_participant" IS NULL OR "allowance_per_participant" > 0),
  ADD CONSTRAINT "lunch_requests_participant_snapshot_positive" CHECK ("approved_participant_count" IS NULL OR "approved_participant_count" > 0),
  ADD CONSTRAINT "lunch_requests_version_positive" CHECK ("version" > 0),
  ADD CONSTRAINT "lunch_requests_approved_snapshot_complete" CHECK (
    ("status" IN ('APPROVED', 'PAID') AND "calculated_amount" IS NOT NULL AND "allowance_per_participant" IS NOT NULL AND "approved_participant_count" IS NOT NULL)
    OR "status" NOT IN ('APPROVED', 'PAID')
  ),
  ADD CONSTRAINT "lunch_requests_rejection_reason_required" CHECK (
    ("status" = 'REJECTED' AND length(trim("rejection_reason")) > 0)
    OR "status" <> 'REJECTED'
  );

ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_byte_size_positive" CHECK ("byte_size" > 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_nonnegative" CHECK ("amount" >= 0),
  ADD CONSTRAINT "payments_tracking_code_nonempty" CHECK (length(trim("tracking_code")) > 0);

ALTER TABLE "system_settings"
  ADD CONSTRAINT "system_settings_version_positive" CHECK ("version" > 0);

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lunch_requests" ADD CONSTRAINT "lunch_requests_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lunch_participants" ADD CONSTRAINT "lunch_participants_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "lunch_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lunch_participants" ADD CONSTRAINT "lunch_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "lunch_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "lunch_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setting_revisions" ADD CONSTRAINT "setting_revisions_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "system_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setting_revisions" ADD CONSTRAINT "setting_revisions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "lunch_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

