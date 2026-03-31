import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";

import { resolveActivityLootDrop } from "@/lib/activity-loot";
import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
import {
  applyClassPassiveDelta,
  getClassPassive,
  getClassPassiveActivityEnergyCost,
  getClassPassiveEnergyRefreshBonus,
  getClassPassiveRollModifier,
} from "@/lib/class-identity";
import {
  ACTIVITY_DEFINITION_MAP,
  ACTIVITY_DEFINITIONS,
  ACTIVITY_GROUPS,
  getActivityGroupAvailability,
  getActivityLocationContext,
  isActivityGroupOpen,
} from "@/lib/core-loop-data";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { isSerializableConflict, runSerializableTransaction } from "@/lib/db-transaction";
import { resolveActivityRoll } from "@/lib/roll-engine";
import {
  applyHalfOrcRelentless,
  applyRacePassiveDelta,
  getRacePassive,
  getRacePassiveRollModifier,
} from "@/lib/race-identity";
import {
  buildCharacterResourceUpdateInput,
  calculateCharacterResourceResult,
  getCharacterResourceSnapshot,
} from "@/lib/resource-rules";
import { logServerError } from "@/lib/server-logger";
import {
  applyEquippedItemActivityDelta,
  getCharacterEffectiveStats,
  getEquippedItemRollModifier,
} from "@/lib/stat-effects";
import { getLevelProgressMeta } from "@/lib/level-progression";
import { getSessionTokenFromRequestCookies } from "@/lib/session";
import { getItemMaxStack, isItemStackable } from "@/lib/items/helpers";
import { activityActionSchema } from "@/lib/validators/core-loop";
import { getCharacterCarryWeightSummary, getItemWeightById } from "@/lib/weight-rules";

const HALF_ORC_RELENTLESS_COOKIE_NAME = "zakzum_half_orc_relentless";

const ACTIVITY_CHARACTER_SELECT = {
  id: true,
  characterClass: true,
  characterRace: true,
  strength: true,
  dexterity: true,
  constitution: true,
  intelligence: true,
  wisdom: true,
  charisma: true,
  hp: true,
  energy: true,
  maxEnergy: true,
  energyRegenAt: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
  nextActivityRollBonus: true,
  unspentStatPoints: true,
  updatedAt: true,
};

const ACTIVITY_ITEM_SELECT = {
  id: true,
  itemId: true,
  itemName: true,
  quantity: true,
  isEquipped: true,
};

function buildActivityContext(activity) {
  const context = getActivityLocationContext(activity);
  if (!context) {
    return null;
  }

  return {
    locationId: context.locationId,
    locationName: context.locationName,
    locationTitle: context.locationTitle,
    regionId: context.regionId,
    regionName: context.regionName,
  };
}

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizePositiveQuantity(value, fallback = 1) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(1, Math.floor(numericValue));
}

async function applyLootDropToInventory(
  tx,
  characterId,
  characterStrength,
  ownedItems,
  lootDrop,
) {
  if (!lootDrop?.dropped || !lootDrop.item) {
    return {
      loot: null,
      blockedByCarry: null,
    };
  }

  const item = lootDrop.item;
  const stackable = isItemStackable(item);
  const maxStack = getItemMaxStack(item);

  const existingStack = stackable
    ? ownedItems
        .filter((ownedItem) => ownedItem.itemId === item.id && ownedItem.quantity < maxStack)
        .sort((left, right) => left.quantity - right.quantity)[0] ?? null
    : null;
  const projectedOwnedItems = ownedItems.map((ownedItem) => ({
    itemId: ownedItem.itemId,
    quantity: normalizePositiveQuantity(ownedItem.quantity, 1),
  }));

  const existingProjectedEntry = projectedOwnedItems.find(
    (ownedItem) => ownedItem.itemId === item.id,
  );

  if (existingProjectedEntry) {
    existingProjectedEntry.quantity += 1;
  } else {
    projectedOwnedItems.push({
      itemId: item.id,
      quantity: 1,
    });
  }

  const currentCarrySummary = getCharacterCarryWeightSummary(
    characterStrength,
    ownedItems,
  );
  const projectedCarrySummary = getCharacterCarryWeightSummary(
    characterStrength,
    projectedOwnedItems,
  );

  if (projectedCarrySummary.currentWeight > projectedCarrySummary.maxWeight) {
    return {
      loot: null,
      blockedByCarry: {
        reason: "carry_capacity_exceeded",
        itemId: item.id,
        itemName: item.name,
        itemWeight: getItemWeightById(item.id),
        currentWeight: currentCarrySummary.currentWeight,
        projectedWeight: projectedCarrySummary.currentWeight,
        maxWeight: projectedCarrySummary.maxWeight,
      },
    };
  }

  let itemRecord;
  let quantityBefore = 0;

  if (existingStack) {
    quantityBefore = normalizePositiveQuantity(existingStack.quantity, 1);
    itemRecord = await tx.characterItem.update({
      where: { id: existingStack.id },
      data: {
        quantity: {
          increment: 1,
        },
      },
      select: {
        id: true,
        quantity: true,
      },
    });
  } else {
    itemRecord = await tx.characterItem.create({
      data: {
        characterId,
        itemId: item.id,
        itemName: item.name,
        quantity: 1,
        isEquipped: false,
      },
      select: {
        id: true,
        quantity: true,
      },
    });
  }

  return {
    loot: {
      itemId: item.id,
      name: item.name,
      category: item.category,
      rarity: item.rarity,
      quantity: 1,
      stackable,
      maxStack,
      itemRecordId: itemRecord.id,
      quantityBefore,
      quantityAfter: itemRecord.quantity,
    },
    blockedByCarry: null,
  };
}

function buildLootLogDetails(lootDrop, loot, blockedByCarry = null) {
  if (!lootDrop) {
    return {
      dropped: false,
      reason: "loot_not_resolved",
    };
  }

  if (blockedByCarry) {
    return {
      dropped: false,
      reason: "blocked_by_carry_capacity",
      source: lootDrop.lootSource,
      activityTier: lootDrop.activityTier,
      dropChance: lootDrop.dropChance,
      dropRoll: lootDrop.dropRoll,
      pickRoll: lootDrop.pickRoll,
      candidateCount: lootDrop.candidateCount,
      blockedByCarry,
    };
  }

  if (!lootDrop.dropped || !loot) {
    return {
      dropped: false,
      reason: lootDrop.reason,
      source: lootDrop.lootSource,
      activityTier: lootDrop.activityTier,
      dropChance: lootDrop.dropChance,
      dropRoll: lootDrop.dropRoll,
      candidateCount: lootDrop.candidateCount,
    };
  }

  return {
    dropped: true,
    reason: lootDrop.reason,
    source: lootDrop.lootSource,
    activityTier: lootDrop.activityTier,
    dropChance: lootDrop.dropChance,
    dropRoll: lootDrop.dropRoll,
    pickRoll: lootDrop.pickRoll,
    candidateCount: lootDrop.candidateCount,
    item: loot,
  };
}

export async function GET() {
  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  const activeCharacter = await getActiveCharacterForUser(user.id);

  return NextResponse.json(
    {
      groups: ACTIVITY_GROUPS.map((group) => ({
        availability: getActivityGroupAvailability(group.id),
        id: group.id,
        name: group.name,
        tagline: group.tagline,
        summary: group.summary,
        regionId: group.regionId ?? null,
        regionName: group.regionName ?? null,
        overviewBadges: group.overviewBadges ?? [],
        activities: ACTIVITY_DEFINITIONS.filter(
          (activity) => activity.groupId === group.id,
        )
          .sort((left, right) => (left.tier ?? 0) - (right.tier ?? 0))
          .map((activity) => ({
            id: activity.id,
            groupId: activity.groupId,
            tier: activity.tier,
            name: activity.name,
            locationId: activity.locationId ?? null,
            locationName: activity.locationName ?? null,
            locationTitle: activity.locationTitle ?? null,
            regionId: activity.regionId ?? null,
            regionName: activity.regionName ?? null,
            energyCost: activity.energyCost,
            riskProfile: activity.riskProfile,
            successReward: activity.successReward,
            failPenalty: activity.failPenalty,
          })),
      })),
      activities: ACTIVITY_DEFINITIONS.map((activity) => ({
        id: activity.id,
        groupId: activity.groupId,
        tier: activity.tier,
        name: activity.name,
        locationId: activity.locationId ?? null,
        locationName: activity.locationName ?? null,
        locationTitle: activity.locationTitle ?? null,
        regionId: activity.regionId ?? null,
        regionName: activity.regionName ?? null,
        energyCost: activity.energyCost,
        successReward: activity.successReward,
        failPenalty: activity.failPenalty,
      })),
      resources: activeCharacter ? getCharacterResourceSnapshot(activeCharacter) : null,
    },
    { status: 200 },
  );
}

export async function POST(request) {
  const originError = validateWriteRequestOrigin(request);
  if (originError) {
    return originError;
  }

  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  const parsed = activityActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid activity.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const activeCharacter = await getActiveCharacterForUser(user.id);

  if (!activeCharacter) {
    return NextResponse.json(
      { message: "You must create a character before you can do activities." },
      { status: 400 },
    );
  }

  const sessionToken = await getSessionTokenFromRequestCookies();
  const sessionTokenHash = sessionToken ? hashSessionToken(sessionToken) : null;
  const cookieStore = await cookies();
  const halfOrcRelentlessCookieValue =
    cookieStore.get(HALF_ORC_RELENTLESS_COOKIE_NAME)?.value ?? "";
  const halfOrcRelentlessUsedThisSession = Boolean(
    sessionTokenHash && halfOrcRelentlessCookieValue === sessionTokenHash,
  );

  try {
    const activity = ACTIVITY_DEFINITION_MAP[parsed.data.activityId];
    if (!activity) {
      return NextResponse.json(
        { message: "Activity was not found." },
        { status: 404 },
      );
    }
    const activityGroupId = activity.groupId ?? activity.id;
    const activityGroupAvailability = getActivityGroupAvailability(activityGroupId);

    if (!isActivityGroupOpen(activityGroupId)) {
      return NextResponse.json(
        { message: activityGroupAvailability.reason || "This activity group is currently unavailable." },
        { status: 403 },
      );
    }

    const activityContext = buildActivityContext(activity);

    const result = await runSerializableTransaction(async (tx) => {
      const latestCharacter = await tx.character.findUnique({
        where: { id: activeCharacter.id },
        select: ACTIVITY_CHARACTER_SELECT,
      });

      if (!latestCharacter) {
        return {
          ok: false,
          status: 404,
          message: "Character was not found.",
        };
      }

      const ownedItems = await tx.characterItem.findMany({
        where: {
          characterId: latestCharacter.id,
        },
        select: ACTIVITY_ITEM_SELECT,
      });
      const equippedItems = ownedItems
        .filter((item) => item.isEquipped)
        .map((item) => ({ itemId: item.itemId }));

      const classPassive = getClassPassive(latestCharacter.characterClass);
      const racePassive = getRacePassive(latestCharacter.characterRace);
      const activityEnergyCost = getClassPassiveActivityEnergyCost(
        latestCharacter.characterClass,
        activity.energyCost,
      );
      const classRollModifier = getClassPassiveRollModifier(
        latestCharacter.characterClass,
        activityGroupId,
      );
      const raceRollModifier = getRacePassiveRollModifier(
        latestCharacter.characterRace,
        activityGroupId,
      );
      const consumableRollModifier = Number(latestCharacter.nextActivityRollBonus) || 0;
      const passiveRollModifier = classRollModifier + raceRollModifier;
      const itemRollModifier = getEquippedItemRollModifier(
        equippedItems,
        activityGroupId,
      );
      const totalRollModifier =
        passiveRollModifier + itemRollModifier + consumableRollModifier;
      const statSummary = getCharacterEffectiveStats(latestCharacter, equippedItems);
      const rollResult = resolveActivityRoll(statSummary.effective, activity, {
        level: latestCharacter.level,
        passiveRollModifier: totalRollModifier,
      });
      const classPassiveResolvedDelta = applyClassPassiveDelta({
        characterClass: latestCharacter.characterClass,
        success: rollResult.success,
        delta: rollResult.delta,
        activityId: activityGroupId,
      });
      const racePassiveResolvedDelta = applyRacePassiveDelta({
        characterRace: latestCharacter.characterRace,
        success: rollResult.success,
        delta: classPassiveResolvedDelta.delta,
        activityId: activityGroupId,
      });
      const itemResolvedDelta = applyEquippedItemActivityDelta({
        equippedItems,
        delta: racePassiveResolvedDelta.delta,
        success: rollResult.success,
        activityId: activityGroupId,
      });
      const lootDrop = resolveActivityLootDrop({
        activityGroupId,
        activityTier: activity.tier ?? 1,
        success: rollResult.success,
      });

      const calculation = calculateCharacterResourceResult(latestCharacter, {
        energyCost: activityEnergyCost,
        delta: itemResolvedDelta.delta,
      });

      if (!calculation.ok) {
        return {
          ok: false,
          status: 400,
          message: calculation.message,
          requiredEnergy: calculation.requiredEnergy,
          resources: getCharacterResourceSnapshot(latestCharacter),
        };
      }

      const halfOrcRelentless = applyHalfOrcRelentless({
        characterRace: latestCharacter.characterRace,
        beforeResources: calculation.before,
        afterResources: calculation.after,
        delta: calculation.delta,
        alreadyUsedThisSession: halfOrcRelentlessUsedThisSession,
      });

      if (halfOrcRelentless.triggered) {
        calculation.after = halfOrcRelentless.afterResources;
        calculation.delta = halfOrcRelentless.delta;
      }

      const gainedLevels = Math.max(
        0,
        calculation.after.level - calculation.before.level,
      );
      const now = new Date();
      const updateResult = await tx.character.updateMany({
        where: {
          id: latestCharacter.id,
          updatedAt: latestCharacter.updatedAt,
        },
        data: {
          ...buildCharacterResourceUpdateInput(calculation.after),
          energyRegenAt: now,
          nextActivityRollBonus: 0,
          ...(gainedLevels > 0
            ? { unspentStatPoints: { increment: gainedLevels } }
            : {}),
        },
      });

      if (updateResult.count !== 1) {
        return {
          ok: false,
          status: 409,
          message: "Character resources changed. Please try the action again.",
        };
      }

      const lootPersistence = await applyLootDropToInventory(
        tx,
        latestCharacter.id,
        latestCharacter.strength,
        ownedItems,
        lootDrop,
      );
      const loot = lootPersistence.loot;
      const lootBlockedByCarry = lootPersistence.blockedByCarry;

      const updatedCharacter = await tx.character.findUnique({
        where: { id: latestCharacter.id },
        select: {
          id: true,
          hp: true,
          energy: true,
          maxEnergy: true,
          energyRegenAt: true,
          gold: true,
          xp: true,
          level: true,
          renown: true,
          heat: true,
          nextActivityRollBonus: true,
          unspentStatPoints: true,
        },
      });

      const logEntry = await tx.activityLog.create({
        data: {
          characterId: latestCharacter.id,
          type: "ACTIVITY",
          activityId: activity.id,
          activityName: activity.name,
          success: rollResult.success,
          energyCost: activityEnergyCost,
          roll: rollResult.roll,
          rollTotal: rollResult.rollTotal,
          successTarget: rollResult.successTarget,
          statModifier: rollResult.statModifier,
          chancePercent: rollResult.chancePercent,
          delta: calculation.delta,
          beforeResources: calculation.before,
          afterResources: calculation.after,
          details: {
            roll: {
              value: rollResult.roll,
              total: rollResult.rollTotal,
              target: rollResult.successTarget,
              baseTarget: rollResult.baseSuccessTarget,
              difficultyLevelScaling: rollResult.difficultyLevelScaling,
              statModifier: rollResult.statModifier,
              chancePercent: rollResult.chancePercent,
            },
            classIdentity: {
              class: latestCharacter.characterClass,
              passive: classPassive,
              activityGroupId,
              baseEnergyCost: activity.energyCost,
              effectiveEnergyCost: activityEnergyCost,
              passiveEnergyCostReduction: Math.max(
                0,
                activity.energyCost - activityEnergyCost,
              ),
              classRollModifier,
              passiveEnergyRefreshBonus: getClassPassiveEnergyRefreshBonus(
                latestCharacter.characterClass,
              ),
              passiveDeltaBonus: classPassiveResolvedDelta.deltaBonus,
            },
            raceIdentity: {
              race: latestCharacter.characterRace,
              passive: racePassive,
              activityGroupId,
              raceRollModifier,
              passiveDeltaBonus: racePassiveResolvedDelta.deltaBonus,
              halfOrcRelentlessTriggered: halfOrcRelentless.triggered,
              halfOrcRelentlessDeltaBonus: halfOrcRelentless.deltaBonus,
              halfOrcRelentlessAlreadyUsed: halfOrcRelentlessUsedThisSession,
            },
            itemIdentity: {
              rollModifier: itemRollModifier,
              activityGroupId,
              deltaBonus: itemResolvedDelta.deltaBonus,
            },
            consumableIdentity: {
              consumedNextActivityRollBonus: consumableRollModifier,
              remainingNextActivityRollBonus: 0,
            },
            activityContext,
            stats: statSummary,
            loot: buildLootLogDetails(lootDrop, loot, lootBlockedByCarry),
          },
        },
        select: { id: true },
      });

      return {
        ok: true,
        updatedCharacter,
        logEntry,
        classPassive,
        racePassive,
        activityEnergyCost,
        classRollModifier,
        raceRollModifier,
        itemRollModifier,
        consumableRollModifier,
        passiveRollModifier,
        totalRollModifier,
        classPassiveResolvedDelta,
        racePassiveResolvedDelta,
        itemResolvedDelta,
        halfOrcRelentlessTriggered: halfOrcRelentless.triggered,
        halfOrcRelentlessDeltaBonus: halfOrcRelentless.deltaBonus,
        halfOrcRelentlessAlreadyUsed: halfOrcRelentlessUsedThisSession,
        rollResult,
        statSummary,
        calculation,
        leveledUp: calculation.after.level > calculation.before.level,
        gainedStatPoints: gainedLevels,
        characterClass: latestCharacter.characterClass,
        characterRace: latestCharacter.characterRace,
        activityGroupId,
        lootDrop,
        loot,
        lootBlockedByCarry,
      };
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          message: result.message,
          requiredEnergy: result.requiredEnergy,
          resources: result.resources,
        },
        { status: result.status },
      );
    }
    const baseMessage = result.leveledUp
      ? result.rollResult.success
        ? `${activity.name} succeeded. Level up! You are now level ${result.calculation.after.level} and gained ${result.gainedStatPoints} stat point${result.gainedStatPoints === 1 ? "" : "s"}.`
        : `${activity.name} failed. Level up! You are now level ${result.calculation.after.level} and gained ${result.gainedStatPoints} stat point${result.gainedStatPoints === 1 ? "" : "s"}.`
      : result.rollResult.success
        ? `${activity.name} succeeded.`
        : `${activity.name} failed.`;
    const lootMessageSuffix = result.loot?.name
      ? ` Loot found: ${result.loot.name}.`
      : "";
    const lootBlockedByCarryMessageSuffix = result.lootBlockedByCarry
      ? " Loot found, but you are carrying too much to keep it."
      : "";

    const response = NextResponse.json(
      {
        message: `${baseMessage}${lootMessageSuffix}${lootBlockedByCarryMessageSuffix}`,
        action: {
          id: activity.id,
          groupId: result.activityGroupId,
          name: activity.name,
          locationId: activityContext?.locationId ?? null,
          locationName: activityContext?.locationName ?? null,
          locationTitle: activityContext?.locationTitle ?? null,
          regionId: activityContext?.regionId ?? null,
          regionName: activityContext?.regionName ?? null,
          energyCost: result.activityEnergyCost,
        },
        result: {
          success: result.rollResult.success,
          energyCost: result.activityEnergyCost,
          activityContext,
          progression: {
            leveledUp: result.leveledUp,
            gainedStatPoints: result.gainedStatPoints,
            levelBefore: result.calculation.before.level,
            levelAfter: result.calculation.after.level,
            xp: getLevelProgressMeta(
              result.calculation.after.level,
              result.calculation.after.xp,
            ),
            unspentStatPoints: result.updatedCharacter.unspentStatPoints,
          },
          classIdentity: {
            class: result.characterClass,
            passive: result.classPassive,
            activityGroupId: result.activityGroupId,
            baseEnergyCost: activity.energyCost,
            effectiveEnergyCost: result.activityEnergyCost,
            passiveEnergyCostReduction: Math.max(
              0,
              activity.energyCost - result.activityEnergyCost,
            ),
            passiveRollModifier: result.classRollModifier,
            passiveEnergyRefreshBonus: getClassPassiveEnergyRefreshBonus(
              result.characterClass,
            ),
            passiveDeltaBonus: result.classPassiveResolvedDelta.deltaBonus,
          },
          raceIdentity: {
            race: result.characterRace,
            passive: result.racePassive,
            activityGroupId: result.activityGroupId,
            passiveRollModifier: result.raceRollModifier,
            passiveDeltaBonus: result.racePassiveResolvedDelta.deltaBonus,
            halfOrcRelentlessTriggered: result.halfOrcRelentlessTriggered,
            halfOrcRelentlessDeltaBonus: result.halfOrcRelentlessDeltaBonus,
            halfOrcRelentlessAlreadyUsed: result.halfOrcRelentlessAlreadyUsed,
          },
          itemIdentity: {
            passiveRollModifier: result.itemRollModifier,
            activityGroupId: result.activityGroupId,
            passiveDeltaBonus: result.itemResolvedDelta.deltaBonus,
          },
          consumableIdentity: {
            consumedNextActivityRollBonus: result.consumableRollModifier,
            remainingNextActivityRollBonus: result.updatedCharacter.nextActivityRollBonus,
          },
          roll: {
            value: result.rollResult.roll,
            total: result.rollResult.rollTotal,
            target: result.rollResult.successTarget,
            baseTarget: result.rollResult.baseSuccessTarget,
            difficultyLevelScaling: result.rollResult.difficultyLevelScaling,
            statModifier: result.rollResult.statModifier,
            totalRollBonus: result.rollResult.totalRollBonus,
            statContribution: result.rollResult.calculations.statContribution,
            primaryContribution: result.rollResult.calculations.primaryContribution,
            secondaryContribution: result.rollResult.calculations.secondaryContribution,
            levelContribution: result.rollResult.calculations.levelContribution,
            baseStatModifier: result.rollResult.calculations.baseStatModifier,
            levelModifier: result.rollResult.calculations.levelModifier,
            passiveRollModifier: result.passiveRollModifier,
            itemRollModifier: result.itemRollModifier,
            consumableRollModifier: result.consumableRollModifier,
            totalPassiveRollModifier: result.totalRollModifier,
            characterLevel: result.rollResult.calculations.characterLevel,
            chancePercent: result.rollResult.chancePercent,
            primaryStat: result.rollResult.calculations.primaryStat,
            secondaryStat: result.rollResult.calculations.secondaryStat,
            primaryStatValue: result.rollResult.calculations.primaryStatValue,
            secondaryStatValue: result.rollResult.calculations.secondaryStatValue,
            effectivePrimaryStat: result.rollResult.calculations.effectivePrimaryStat,
            effectiveSecondaryStat: result.rollResult.calculations.effectiveSecondaryStat,
            primaryModifier: result.rollResult.calculations.primaryModifier,
            secondaryModifier: result.rollResult.calculations.secondaryModifier,
            scale: result.rollResult.scale,
          },
          stats: result.statSummary,
          delta: result.calculation.delta,
          totals: {
            before: result.calculation.before,
            after: getCharacterResourceSnapshot(result.updatedCharacter),
          },
          loot: result.loot ?? null,
          lootBlockedByCarry: result.lootBlockedByCarry ?? null,
          logId: result.logEntry?.id,
        },
      },
      { status: 200 },
    );

    if (result.halfOrcRelentlessTriggered && sessionTokenHash) {
      response.cookies.set(HALF_ORC_RELENTLESS_COOKIE_NAME, sessionTokenHash, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }

    return response;
  } catch (error) {
    if (isSerializableConflict(error)) {
      return NextResponse.json(
        { message: "Activity could not be completed due to a resource conflict. Try again." },
        { status: 409 },
      );
    }

    logServerError("/api/game/activities", error, {
      userId: user.id,
      characterId: activeCharacter.id,
      activityId: parsed.data.activityId,
    });
    return NextResponse.json(
      { message: "Something went wrong while processing the activity." },
      { status: 500 },
    );
  }
}
