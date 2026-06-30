-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable: Add role to users
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- AlterTable: Add created_by_id to clients
ALTER TABLE "clients" ADD COLUMN "created_by_id" TEXT;
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "clients_created_by_id_idx" ON "clients"("created_by_id");

-- AlterTable: Add created_by_id to equipment
ALTER TABLE "equipment" ADD COLUMN "created_by_id" TEXT;
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "equipment_created_by_id_idx" ON "equipment"("created_by_id");

-- AlterTable: Add created_by_id to software
ALTER TABLE "software" ADD COLUMN "created_by_id" TEXT;
ALTER TABLE "software" ADD CONSTRAINT "software_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "software_created_by_id_idx" ON "software"("created_by_id");

-- AlterTable: Add created_by_id to templates
ALTER TABLE "templates" ADD COLUMN "created_by_id" TEXT;
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "templates_created_by_id_idx" ON "templates"("created_by_id");

-- AlterTable: Add created_by_id to attachments
ALTER TABLE "attachments" ADD COLUMN "created_by_id" TEXT;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "attachments_created_by_id_idx" ON "attachments"("created_by_id");

-- Backfill: set admin user role to ADMIN
UPDATE "users" SET "role" = 'ADMIN' WHERE "username" = 'admin';

-- Backfill: set created_by_id to admin's id for all existing records
DO $$
DECLARE admin_id TEXT;
BEGIN
  SELECT "id" INTO admin_id FROM "users" WHERE "username" = 'admin' LIMIT 1;
  IF admin_id IS NOT NULL THEN
    UPDATE "clients" SET "created_by_id" = admin_id WHERE "created_by_id" IS NULL;
    UPDATE "equipment" SET "created_by_id" = admin_id WHERE "created_by_id" IS NULL;
    UPDATE "software" SET "created_by_id" = admin_id WHERE "created_by_id" IS NULL;
    UPDATE "templates" SET "created_by_id" = admin_id WHERE "created_by_id" IS NULL;
    UPDATE "attachments" SET "created_by_id" = admin_id WHERE "created_by_id" IS NULL;
  END IF;
END $$;
