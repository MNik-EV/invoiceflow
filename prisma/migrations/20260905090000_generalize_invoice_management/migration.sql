-- Generalize the original lunch-only domain without losing existing records.

CREATE TYPE "Role_next" AS ENUM ('USER', 'FINANCE_ADMIN', 'SUPER_ADMIN');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_next"
USING (CASE WHEN "role"::text = 'LUNCH_ADMIN' THEN 'FINANCE_ADMIN' ELSE "role"::text END)::"Role_next";
DROP TYPE "Role";
ALTER TYPE "Role_next" RENAME TO "Role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER';

ALTER TABLE "sessions" ADD COLUMN "provider" VARCHAR(80) NOT NULL DEFAULT 'local';

-- These checks reference the old enum and must be recreated after the type swap.
ALTER TABLE "lunch_requests" DROP CONSTRAINT "lunch_requests_approved_snapshot_complete";
ALTER TABLE "lunch_requests" DROP CONSTRAINT "lunch_requests_rejection_reason_required";

CREATE TYPE "InvoiceRequestStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PAID');
ALTER TABLE "lunch_requests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "lunch_requests" ALTER COLUMN "status" TYPE "InvoiceRequestStatus" USING "status"::text::"InvoiceRequestStatus";
ALTER TABLE "request_status_history" ALTER COLUMN "from_status" TYPE "InvoiceRequestStatus" USING "from_status"::text::"InvoiceRequestStatus";
ALTER TABLE "request_status_history" ALTER COLUMN "to_status" TYPE "InvoiceRequestStatus" USING "to_status"::text::"InvoiceRequestStatus";
DROP TYPE "LunchRequestStatus";
ALTER TABLE "lunch_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING_REVIEW';

CREATE TYPE "InvoiceCategory" AS ENUM ('LUNCH', 'LAB_PURCHASE');
CREATE TYPE "LabPurchaseCategory" AS ENUM ('IC', 'MOSFET', 'MODULE', 'SENSOR', 'PCB', 'TOOL', 'OTHER');
ALTER TYPE "AttachmentType" ADD VALUE IF NOT EXISTS 'SUPPORTING_DOCUMENT';

ALTER TABLE "lunch_requests" RENAME TO "invoice_requests";
ALTER TABLE "invoice_requests" RENAME COLUMN "lunch_date" TO "invoice_date";
ALTER TABLE "invoice_requests" RENAME CONSTRAINT "lunch_requests_invoice_amount_positive" TO "invoice_requests_invoice_amount_positive";
ALTER TABLE "invoice_requests" RENAME CONSTRAINT "lunch_requests_calculated_amount_nonnegative" TO "invoice_requests_calculated_amount_nonnegative";
ALTER TABLE "invoice_requests" RENAME CONSTRAINT "lunch_requests_allowance_positive" TO "invoice_requests_allowance_positive";
ALTER TABLE "invoice_requests" RENAME CONSTRAINT "lunch_requests_participant_snapshot_positive" TO "invoice_requests_participant_snapshot_positive";
ALTER TABLE "invoice_requests" RENAME CONSTRAINT "lunch_requests_version_positive" TO "invoice_requests_version_positive";
ALTER TABLE "invoice_requests" ADD COLUMN "category" "InvoiceCategory" NOT NULL DEFAULT 'LUNCH';
ALTER TABLE "invoice_requests" ADD COLUMN "title" VARCHAR(200);
ALTER TABLE "invoice_requests" ADD COLUMN "vendor_name" VARCHAR(200);
ALTER TABLE "invoice_requests" ADD COLUMN "purchase_category" "LabPurchaseCategory";

ALTER TABLE "lunch_participants" RENAME TO "invoice_participants";

ALTER INDEX "lunch_requests_status_date_idx" RENAME TO "invoice_requests_status_date_idx";
ALTER INDEX "lunch_requests_creator_date_idx" RENAME TO "invoice_requests_creator_date_idx";
DROP INDEX "lunch_requests_date_idx";
CREATE INDEX "invoice_requests_category_date_idx" ON "invoice_requests"("category", "invoice_date" DESC);
ALTER INDEX "lunch_participants_request_user_key" RENAME TO "invoice_participants_request_user_key";
ALTER INDEX "lunch_participants_user_request_idx" RENAME TO "invoice_participants_user_request_idx";

ALTER TABLE "invoice_requests" ADD CONSTRAINT "invoice_requests_category_fields_check" CHECK (
  ("category" = 'LUNCH' AND "purchase_category" IS NULL)
  OR
  ("category" = 'LAB_PURCHASE' AND "title" IS NOT NULL AND "purchase_category" IS NOT NULL)
);

ALTER TABLE "invoice_requests" ADD CONSTRAINT "invoice_requests_approved_snapshot_complete" CHECK (
  (
    "status" IN ('APPROVED', 'PAID')
    AND "calculated_amount" IS NOT NULL
    AND (
      ("category" = 'LUNCH' AND "allowance_per_participant" IS NOT NULL AND "approved_participant_count" IS NOT NULL)
      OR
      ("category" = 'LAB_PURCHASE' AND "allowance_per_participant" IS NULL AND "approved_participant_count" IS NULL)
    )
  )
  OR "status" NOT IN ('APPROVED', 'PAID')
);

ALTER TABLE "invoice_requests" ADD CONSTRAINT "invoice_requests_rejection_reason_required" CHECK (
  ("status" = 'REJECTED' AND length(trim("rejection_reason")) > 0)
  OR "status" <> 'REJECTED'
);

UPDATE "system_settings"
SET "key" = 'invoice.max_amount_toman', "value" = '10000000000'::jsonb
WHERE "key" = 'lunch.max_invoice_toman';
