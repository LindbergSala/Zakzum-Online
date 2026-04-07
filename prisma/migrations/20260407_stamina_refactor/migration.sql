ALTER TABLE "Character" RENAME COLUMN "energy" TO "stamina";
ALTER TABLE "Character" RENAME COLUMN "maxEnergy" TO "maxStamina";
ALTER TABLE "Character" RENAME COLUMN "energyRegenAt" TO "staminaRegenAt";

ALTER TABLE "ActivityLog" RENAME COLUMN "energyCost" TO "staminaCost";

UPDATE "CharacterItem"
SET
  "itemId" = 'stamina-draught',
  "itemName" = 'Stamina Draught'
WHERE "itemId" = 'energy-draught';