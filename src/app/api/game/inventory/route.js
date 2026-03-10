import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
import { SHOP_ITEM_DEFINITION_MAP } from "@/lib/core-loop-data";
import { prisma } from "@/lib/prisma";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import { formatStatBonusLabel, getCharacterEffectiveStats } from "@/lib/stat-effects";
import { inventoryEquipSchema } from "@/lib/validators/core-loop";

function enrichInventoryItems(items) {
  return items.map((item) => {
    const definition = SHOP_ITEM_DEFINITION_MAP[item.itemId];

    return {
      ...item,
      slot: definition?.slot ?? "unknown",
      effects: definition?.effects ?? { stats: {} },
      effectLabel: formatStatBonusLabel(definition?.effects?.stats),
    };
  });
}

export async function GET() {
  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  const activeCharacter = await getActiveCharacterForUser(user.id);

  if (!activeCharacter) {
    return NextResponse.json(
      { items: [], resources: null, stats: null },
      { status: 200 },
    );
  }

  const items = await prisma.characterItem.findMany({
    where: { characterId: activeCharacter.id },
    select: {
      id: true,
      itemId: true,
      itemName: true,
      isEquipped: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const enrichedItems = enrichInventoryItems(items);
  const equippedItems = enrichedItems.filter((item) => item.isEquipped);
  const statSummary = getCharacterEffectiveStats(activeCharacter, equippedItems);

  return NextResponse.json(
    {
      items: enrichedItems,
      resources: getCharacterResourceSnapshot(activeCharacter),
      stats: statSummary,
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
      { message: "Ogiltig JSON i request body." },
      { status: 400 },
    );
  }

  const parsed = inventoryEquipSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Ogiltigt item-val.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const activeCharacter = await getActiveCharacterForUser(user.id);

  if (!activeCharacter) {
    return NextResponse.json(
      { message: "Du maste skapa en karaktar innan du kan equipa items." },
      { status: 400 },
    );
  }

  const itemId = parsed.data.itemId;
  const itemDefinition = SHOP_ITEM_DEFINITION_MAP[itemId];
  if (!itemDefinition) {
    return NextResponse.json(
      { message: "Okand item-definition." },
      { status: 400 },
    );
  }

  const ownedItems = await prisma.characterItem.findMany({
    where: { characterId: activeCharacter.id },
    select: {
      id: true,
      itemId: true,
      itemName: true,
      isEquipped: true,
    },
  });
  const ownedItem = ownedItems.find((item) => item.itemId === itemId);

  if (!ownedItem) {
    return NextResponse.json(
      { message: "Du ager inte detta item." },
      { status: 404 },
    );
  }

  const sameSlotItemIds = ownedItems
    .filter(
      (item) => SHOP_ITEM_DEFINITION_MAP[item.itemId]?.slot === itemDefinition.slot,
    )
    .map((item) => item.itemId);
  const currentResources = getCharacterResourceSnapshot(activeCharacter);

  const result = await prisma.$transaction(async (tx) => {
    if (sameSlotItemIds.length > 0) {
      await tx.characterItem.updateMany({
        where: {
          characterId: activeCharacter.id,
          itemId: { in: sameSlotItemIds },
        },
        data: { isEquipped: false },
      });
    }

    const equippedItem = await tx.characterItem.update({
      where: {
        characterId_itemId: {
          characterId: activeCharacter.id,
          itemId,
        },
      },
      data: { isEquipped: true },
      select: {
        id: true,
        itemId: true,
        itemName: true,
        isEquipped: true,
      },
    });

    const allItems = await tx.characterItem.findMany({
      where: { characterId: activeCharacter.id },
      select: {
        id: true,
        itemId: true,
        itemName: true,
        isEquipped: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const logEntry = await tx.activityLog.create({
      data: {
        characterId: activeCharacter.id,
        type: "EQUIP",
        activityId: itemId,
        activityName: `Equip: ${ownedItem.itemName}`,
        success: true,
        energyCost: 0,
        roll: 0,
        rollTotal: 0,
        successTarget: 0,
        statModifier: 0,
        chancePercent: 0,
        delta: {},
        beforeResources: currentResources,
        afterResources: currentResources,
        details: {
          item: {
            id: itemId,
            name: ownedItem.itemName,
            slot: itemDefinition.slot,
            effects: itemDefinition.effects ?? {},
          },
        },
      },
      select: { id: true },
    });

    return { equippedItem, allItems, logEntry };
  });

  const enrichedItems = enrichInventoryItems(result.allItems);
  const equippedItems = enrichedItems.filter((item) => item.isEquipped);
  const statSummary = getCharacterEffectiveStats(activeCharacter, equippedItems);

  return NextResponse.json(
    {
      message: ownedItem.isEquipped
        ? `${ownedItem.itemName} var redan equipped.`
        : `${ownedItem.itemName} ar nu equipped.`,
      item: result.equippedItem,
      logId: result.logEntry.id,
      items: enrichedItems,
      resources: getCharacterResourceSnapshot(activeCharacter),
      stats: statSummary,
    },
    { status: 200 },
  );
}
