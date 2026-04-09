ALTER TABLE "ActivityLog"
ALTER COLUMN "type" DROP DEFAULT;

ALTER TABLE "ActivityLog"
ALTER COLUMN "type" TYPE TEXT;

DROP TYPE "ActivityLogType";

CREATE TYPE "ActivityLogType" AS ENUM ('ACTIVITY', 'SHOP', 'EQUIP', 'ONBOARDING');

UPDATE "ActivityLog"
SET "type" = 'ONBOARDING'
WHERE "activityId" IN ('onboarding-complete-bonus', 'onboarding-zakzum-lore');

ALTER TABLE "ActivityLog"
ALTER COLUMN "type" TYPE "ActivityLogType"
USING ("type"::"ActivityLogType");

ALTER TABLE "ActivityLog"
ALTER COLUMN "type" SET DEFAULT 'ACTIVITY';