-- Migrate existing component data to string fields
UPDATE "equipment" SET "processor" = (
  SELECT name || CASE WHEN specs IS NOT NULL THEN ' ' || specs ELSE '' END
  FROM "equipment_components"
  WHERE "equipment_components"."equipment_id" = "equipment".id AND type = 'CPU'
  LIMIT 1
) WHERE id IN (SELECT DISTINCT "equipment_id" FROM "equipment_components" WHERE type = 'CPU');

UPDATE "equipment" SET "ram" = (
  SELECT name || CASE WHEN specs IS NOT NULL THEN ' ' || specs ELSE '' END
  FROM "equipment_components"
  WHERE "equipment_components"."equipment_id" = "equipment".id AND type = 'RAM'
  LIMIT 1
) WHERE id IN (SELECT DISTINCT "equipment_id" FROM "equipment_components" WHERE type = 'RAM');

UPDATE "equipment" SET "disk" = (
  SELECT name || CASE WHEN specs IS NOT NULL THEN ' ' || specs ELSE '' END
  FROM "equipment_components"
  WHERE "equipment_components"."equipment_id" = "equipment".id AND type = 'DISK'
  LIMIT 1
) WHERE id IN (SELECT DISTINCT "equipment_id" FROM "equipment_components" WHERE type = 'DISK');

-- DropTable
DROP TABLE "equipment_components";

-- DropEnum
DROP TYPE "ComponentType";

-- AlterTable
ALTER TABLE "equipment" ADD COLUMN "processor" TEXT,
ADD COLUMN "ram" TEXT,
ADD COLUMN "disk" TEXT;
