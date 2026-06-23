-- Data migration: copy Equipment.softwareId → Software.equipmentId where not already set
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT e.id AS eq_id, e.software_id AS sw_id
    FROM "equipment" e
    WHERE e.software_id IS NOT NULL
  LOOP
    UPDATE "software"
    SET equipment_id = r.eq_id
    WHERE id = r.sw_id AND equipment_id IS NULL;

    IF NOT FOUND THEN
      RAISE NOTICE 'SKIP: software % already assigned to different equipment (equipment %)', r.sw_id, r.eq_id;
    END IF;
  END LOOP;
END $$;

-- DropIndex
DROP INDEX IF EXISTS "equipment_software_id_idx";

-- AlterTable: drop the software_id column from equipment
ALTER TABLE "equipment" DROP COLUMN IF EXISTS "software_id";
