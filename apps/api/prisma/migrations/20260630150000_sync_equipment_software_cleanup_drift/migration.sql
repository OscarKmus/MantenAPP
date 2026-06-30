-- Sync drift from equipment-software-fk-cleanup slice (archived 2026-06-24)
-- That slice was applied directly to the dev database without generating
-- a migration, so the schema.prisma and the database were updated but
-- the migration history was not. This migration captures those changes
-- so a fresh database can reach the same state via `prisma migrate deploy`.
--
-- Source of truth: apps/api/prisma/schema.prisma after the archived slice.

-- DropForeignKey
ALTER TABLE "equipment_components" DROP CONSTRAINT "equipment_components_equipment_id_fkey";

-- AlterTable
ALTER TABLE "equipment" DROP COLUMN "has_license",
DROP COLUMN "license_expires_at",
DROP COLUMN "license_notes",
DROP COLUMN "license_type",
ADD COLUMN     "disk" TEXT,
ADD COLUMN     "processor" TEXT,
ADD COLUMN     "ram" TEXT,
ADD COLUMN     "software_id" TEXT;

-- DropTable
DROP TABLE "equipment_components";

-- DropEnum
DROP TYPE "ComponentType";

-- CreateIndex
CREATE INDEX "equipment_software_id_idx" ON "equipment"("software_id");

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "software"("id") ON DELETE SET NULL ON UPDATE CASCADE;
