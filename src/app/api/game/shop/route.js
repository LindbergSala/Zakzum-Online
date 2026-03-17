import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
import { SHOP_ITEM_DEFINITION_MAP, SHOP_ITEM_DEFINITIONS } from "@/lib/core-loop-data";
import { isSerializableConflict, runSerializableTransaction } from "@/lib/db-transaction";
import { prisma } from "@/lib/prisma";
import {
  buildCharacterResourceUpdateInput,
  calculateCharacterResourceResult,
  getCharacterResourceSnapshot,
} from "@/lib/resource-rules";
import { logServerError } from "@/lib/server-logger";
import { formatStatBonusLabel } from "@/lib/stat-effects";
import { shopPurchaseSchema } from "@/lib/validators/core-loop";
import {
  getCharacterCarryWeightSummary,
  getItemWeightById,
} from "@/lib/weight-rules";

const SHOP_CHARACTER_SELECT = {
  id: true,
  hp: true,
  energy: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
  strength: true,
  updatedAt: true,
};

export async function GET() {
  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  const activeCharacter = await getActiveCharacterForUser(user.id);

  const ownedItems = activeCharacter
    ? await prisma.characterItem.findMany({
        where: { characterId: activeCharacter.id },
        select: {
          itemId: true,
          isEquipped: true,
        },
      })
    : [];

  const ownedById = Object.fromEntries(
    ownedItems.map((item) => [item.itemId, item]),
  );

  return NextResponse.json(
    {
      items: SHOP_ITEM_DEFINITIONS.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        weight: item.weight,
        slot: item.slot,
        effects: item.effects,
        effectLabel: formatStatBonusLabel(item.effects?.stats),
        owned: Boolean(ownedById[item.id]),
        equipped: Boolean(ownedById[item.id]?.isEquipped),
      })),
      resources: activeCharacter ? getCharacterResourceSnapshot(activeCharacter) : null,
    },
    { status: 200 },
  );
}

export async function POST(request) {
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

  const parsed = shopPurchaseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid item selection.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const activeCharacter = await getActiveCharacterForUser(user.id);

  if (!activeCharacter) {
    return NextResponse.json(
      { message: "You must create a character before you can shop." },
      { status: 400 },
    );
  }

  const item = SHOP_ITEM_DEFINITION_MAP[parsed.data.itemId];

  let result;
  try {
    result = await runSerializableTransaction(async (tx) => {
      const latestCharacter = await tx.character.findUnique({
        where: { id: activeCharacter.id },
        select: SHOP_CHARACTER_SELECT,
      });

      if (!latestCharacter) {
        return {
          ok: false,
          status: 404,
          message: "Character was not found.",
        };
      }

      const existingItem = await tx.characterItem.findUnique({
        where: {
          characterId_itemId: {
            characterId: latestCharacter.id,
            itemId: item.id,
          },
        },
        select: { id: true },
      });
      const ownedItems = await tx.characterItem.findMany({
        where: { characterId: latestCharacter.id },
        select: { itemId: true },
      });

      if (existingItem) {
        return {
          ok: false,
          status: 409,
          message: "You already own this item.",
          resources: getCharacterResourceSnapshot(latestCharacter),
        };
      }

      const carrySummary = getCharacterCarryWeightSummary(
        latestCharacter.strength,
        ownedItems,
      );
      const itemWeight = getItemWeightById(item.id);
      const projectedWeight = carrySummary.currentWeight + itemWeight;

      if (projectedWeight > carrySummary.maxWeight) {
        return {
          ok: false,
          status: 400,
          message:
            `Carrying capacity exceeded. ${item.name} weighs ${itemWeight}. ` +
            `Current ${carrySummary.currentWeight}/${carrySummary.maxWeight}.`,
          resources: getCharacterResourceSnapshot(latestCharacter),
        };
      }

      if (latestCharacter.gold < item.price) {
        return {
          ok: false,
          status: 400,
          message: `Not enough Gold. Item costs ${item.price}, you have ${latestCharacter.gold}.`,
          resources: getCharacterResourceSnapshot(latestCharacter),
        };
      }

      const calculation = calculateCharacterResourceResult(latestCharacter, {
        delta: { gold: -item.price },
      });

      if (!calculation.ok) {
        return {
          ok: false,
          status: 400,
          message: "Purchase could not be completed.",
          resources: getCharacterResourceSnapshot(latestCharacter),
        };
      }

      const updateResult = await tx.character.updateMany({
        where: {
          id: latestCharacter.id,
          updatedAt: latestCharacter.updatedAt,
        },
        data: buildCharacterResourceUpdateInput(calculation.after),
      });

      if (updateResult.count !== 1) {
        return {
          ok: false,
          status: 409,
          message: "Character resources changed. Please try the purchase again.",
        };
      }

      const updatedCharacter = await tx.character.findUnique({
        where: { id: latestCharacter.id },
        select: {
          id: true,
          hp: true,
          energy: true,
          gold: true,
          xp: true,
          level: true,
          renown: true,
          heat: true,
        },
      });

      const createdItem = await tx.characterItem.create({
        data: {
          characterId: latestCharacter.id,
          itemId: item.id,
          itemName: item.name,
          isEquipped: false,
        },
        select: {
          id: true,
          itemId: true,
          itemName: true,
          isEquipped: true,
        },
      });

      const logEntry = await tx.activityLog.create({
        data: {
          characterId: latestCharacter.id,
          type: "SHOP",
          activityId: item.id,
          activityName: `Purchase: ${item.name}`,
          success: true,
          energyCost: 0,
          roll: 0,
          rollTotal: 0,
          successTarget: 0,
          statModifier: 0,
          chancePercent: 0,
          delta: calculation.delta,
          beforeResources: calculation.before,
          afterResources: calculation.after,
          details: {
            item: {
              id: item.id,
              name: item.name,
              slot: item.slot,
              price: item.price,
              weight: item.weight,
              effects: item.effects ?? {},
            },
          },
        },
        select: { id: true },
      });

      return {
        ok: true,
        updatedCharacter,
        createdItem,
        logEntry,
        calculation,
      };
    });
  } catch (caughtError) {
    if (isSerializableConflict(caughtError)) {
      return NextResponse.json(
        { message: "Purchase could not be completed due to a resource conflict. Try again." },
        { status: 409 },
      );
    }

    if (
      caughtError instanceof Prisma.PrismaClientKnownRequestError &&
      caughtError.code === "P2002"
    ) {
      return NextResponse.json(
        {
          message: "You already own this item.",
          resources: getCharacterResourceSnapshot(activeCharacter),
        },
        { status: 409 },
      );
    }

    logServerError("/api/game/shop", caughtError, {
      userId: user.id,
      characterId: activeCharacter.id,
      itemId: parsed.data.itemId,
    });
    return NextResponse.json(
      { message: "Something went wrong while processing the purchase." },
      { status: 500 },
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        message: result.message,
        resources: result.resources,
      },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      message: `${item.name} purchased.`,
      item: result.createdItem,
      logId: result.logEntry?.id,
      resources: {
        before: result.calculation.before,
        after: getCharacterResourceSnapshot(result.updatedCharacter),
        delta: result.calculation.delta,
      },
    },
    { status: 200 },
  );
}
