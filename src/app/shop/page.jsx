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

  const shopItems = SHOP_ITEM_DEFINITIONS.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    slot: item.slot,
    effects: item.effects,
    effectLabel: formatStatBonusLabel(item.effects?.stats),
    owned: Boolean(ownedById[item.id]),
    equipped: Boolean(ownedById[item.id]?.isEquipped),
  }));

  return (
    <main>
      <h1>Butik</h1>
      {activeCharacter ? (
        <>
          <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
          <ShopActions items={shopItems} />
        </>
      ) : (
        <p>
          Du maste skapa en karaktar for att handla.{" "}
          <Link href="/character/create">Skapa karaktar</Link>.
        </p>
      )}
      <GameNav />
      <p>
        <Link href="/dashboard">Till dashboard</Link>
      </p>
    </main>
  );
}
