import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
import { SHOP_ITEM_DEFINITION_MAP, SHOP_ITEM_DEFINITIONS } from "@/lib/core-loop-data";
import { prisma } from "@/lib/prisma";
import {
  buildCharacterResourceUpdateInput,
  calculateCharacterResourceResult,
  getCharacterResourceSnapshot,
} from "@/lib/resource-rules";
import { formatStatBonusLabel } from "@/lib/stat-effects";
import { shopPurchaseSchema } from "@/lib/validators/core-loop";

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

  const existingItem = await prisma.characterItem.findUnique({
    where: {
      characterId_itemId: {
        characterId: activeCharacter.id,
        itemId: item.id,
      },
    },
    select: { id: true },
  });

  if (existingItem) {
    return NextResponse.json(
      {
        message: "You already own this item.",
        resources: getCharacterResourceSnapshot(activeCharacter),
      },
      { status: 409 },
    );
  }

  const calculation = calculateCharacterResourceResult(activeCharacter, {
    delta: { gold: -item.price },
  });

  if (!calculation.ok) {
    return NextResponse.json(
      { message: "Purchase could not be completed." },
      { status: 400 },
    );
  }

  if (activeCharacter.gold < item.price) {
    return NextResponse.json(
      {
        message: `Not enough Gold. Item costs ${item.price}, you have ${activeCharacter.gold}.`,
        resources: getCharacterResourceSnapshot(activeCharacter),
      },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedCharacter = await tx.character.update({
      where: { id: activeCharacter.id },
      data: buildCharacterResourceUpdateInput(calculation.after),
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
        characterId: activeCharacter.id,
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
        characterId: activeCharacter.id,
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
            effects: item.effects ?? {},
          },
        },
      },
      select: { id: true },
    });

    return { updatedCharacter, createdItem, logEntry };
  });

  return NextResponse.json(
    {
      message: `${item.name} purchased.`,
      item: result.createdItem,
      logId: result.logEntry.id,
      resources: {
        before: calculation.before,
        after: getCharacterResourceSnapshot(result.updatedCharacter),
        delta: calculation.delta,
      },
    },
    { status: 200 },
  );
}
