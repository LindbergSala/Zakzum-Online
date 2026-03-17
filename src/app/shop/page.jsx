import Link from "next/link";

import GameNav from "@/components/game-nav";
import ResourceStrip from "@/components/resource-strip";
import ShopActions from "@/components/shop-actions";
import { getActiveCharacterForUser } from "@/lib/character";
import { SHOP_ITEM_DEFINITIONS } from "@/lib/core-loop-data";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import { formatStatBonusLabel } from "@/lib/stat-effects";
import { getCharacterCarryWeightSummary } from "@/lib/weight-rules";

export default async function ShopPage() {
  const user = await requirePageUser();
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
  const carryWeightSummary = activeCharacter
    ? getCharacterCarryWeightSummary(activeCharacter.strength, ownedItems)
    : null;

  const shopItems = SHOP_ITEM_DEFINITIONS.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    weight: item.weight,
    slot: item.slot,
    effects: item.effects,
    effectLabel: formatStatBonusLabel(item.effects?.stats),
    owned: Boolean(ownedById[item.id]),
    equipped: Boolean(ownedById[item.id]?.isEquipped),
  }));

  return (
    <main>
      <GameNav />
      <h1>Shop</h1>
      {activeCharacter ? (
        <>
          <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
          <p>
            <strong>Carry weight:</strong> {carryWeightSummary.currentWeight}/
            {carryWeightSummary.maxWeight}
          </p>
          <ShopActions items={shopItems} />
        </>
      ) : (
        <p>
          You must create a character before you can shop.{" "}
          <Link href="/character/create">Create character</Link>.
        </p>
      )}
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </main>
  );
}
