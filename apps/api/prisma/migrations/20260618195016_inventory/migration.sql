-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('RAM', 'CPU', 'DISK', 'GPU', 'PSU', 'MOTHERBOARD', 'OTHER');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('OFFICE', 'NORTON', 'PDF', 'AUTOCAD', 'ANTIVIRUS', 'OTHER');

-- AlterTable
ALTER TABLE "equipment" ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "has_license" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "license_expires_at" TIMESTAMP(3),
ADD COLUMN     "license_notes" TEXT,
ADD COLUMN     "license_type" TEXT;

-- CreateTable
CREATE TABLE "equipment_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_computer" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_components" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL,
    "name" TEXT NOT NULL,
    "specs" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "license_type" "LicenseType" NOT NULL,
    "client_id" TEXT NOT NULL,
    "equipment_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "software_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_categories_name_key" ON "equipment_categories"("name");

-- CreateIndex
CREATE INDEX "equipment_components_equipment_id_idx" ON "equipment_components"("equipment_id");

-- CreateIndex
CREATE INDEX "software_client_id_idx" ON "software"("client_id");

-- CreateIndex
CREATE INDEX "software_equipment_id_idx" ON "software"("equipment_id");

-- CreateIndex
CREATE INDEX "equipment_category_id_idx" ON "equipment"("category_id");

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "equipment_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_components" ADD CONSTRAINT "equipment_components_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software" ADD CONSTRAINT "software_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software" ADD CONSTRAINT "software_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
