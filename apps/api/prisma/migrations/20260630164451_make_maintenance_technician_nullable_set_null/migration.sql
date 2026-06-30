-- Make Maintenance.technicianId nullable with ON DELETE SET NULL
-- This allows deleting a user who is a technician on a maintenance
-- without violating the foreign key constraint. The maintenance is
-- preserved (history), but the technician becomes unknown.

-- DropForeignKey
ALTER TABLE "maintenances" DROP CONSTRAINT "maintenances_technician_id_fkey";

-- AlterTable
ALTER TABLE "maintenances" ALTER COLUMN "technician_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
