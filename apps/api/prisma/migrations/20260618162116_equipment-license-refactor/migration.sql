-- AlterTable
ALTER TABLE "equipment" DROP COLUMN "has_license",
DROP COLUMN "license_type",
DROP COLUMN "license_expires_at",
DROP COLUMN "license_notes",
ADD COLUMN "software_id" TEXT;

-- CreateIndex
CREATE INDEX "equipment_software_id_idx" ON "equipment"("software_id");

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "software"("id") ON DELETE SET NULL ON UPDATE CASCADE;
