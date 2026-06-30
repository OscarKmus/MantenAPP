/*
  Warnings:

  - You are about to drop the column `has_license` on the `equipment` table. All the data in the column will be lost.
  - You are about to drop the column `license_expires_at` on the `equipment` table. All the data in the column will be lost.
  - You are about to drop the column `license_notes` on the `equipment` table. All the data in the column will be lost.
  - You are about to drop the column `license_type` on the `equipment` table. All the data in the column will be lost.
  - You are about to drop the `equipment_components` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "equipment_components" DROP CONSTRAINT "equipment_components_equipment_id_fkey";

-- DropForeignKey
ALTER TABLE "maintenances" DROP CONSTRAINT "maintenances_technician_id_fkey";

-- AlterTable
ALTER TABLE "equipment" DROP COLUMN "has_license",
DROP COLUMN "license_expires_at",
DROP COLUMN "license_notes",
DROP COLUMN "license_type",
ADD COLUMN     "disk" TEXT,
ADD COLUMN     "processor" TEXT,
ADD COLUMN     "ram" TEXT,
ADD COLUMN     "software_id" TEXT;

-- AlterTable
ALTER TABLE "maintenances" ALTER COLUMN "technician_id" DROP NOT NULL;

-- DropTable
DROP TABLE "equipment_components";

-- DropEnum
DROP TYPE "ComponentType";

-- CreateIndex
CREATE INDEX "equipment_software_id_idx" ON "equipment"("software_id");

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "software"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
