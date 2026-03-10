import Link from "next/link";

import GameNav from "@/components/game-nav";
import InventoryActions from "@/components/inventory-actions";
import ResourceStrip from "@/components/resource-strip";
import { getActiveCharacterForUser } from "@/lib/character";
import { SHOP_ITEM_DEFINITION_MAP } from "@/lib/core-loop-data";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import {
  CHARACTER_STAT_KEYS,
  CHARACTER_STAT_LABELS,
  formatStatBonusLabel,
  getCharacterEffectiveStats,
} from "@/lib/stat-effects";

function StatSummary({ summary }) {
  if (!summary) {
    return null;
  }

  return (
    <>
      <p>
        <strong>Nuvarande effektiva stats</strong>
      </p>
      <ul>
        {CHARACTER_STAT_KEYS.map((key) => (
          <li key={key}>
            {CHARACTER_STAT_LABELS[key]}: {summary.base[key]} + {summary.bonus[key]} ={" "}
            {summary.effective[key]}
          </li>
        ))}
      </ul>
    </>
  );
}

export default async function InventoryPage() {
  const user = await requirePageUser();
  const activeCharacter = await getActiveCharacterForUser(user.id);

  const rawItems = activeCharacter
    ? await prisma.characterItem.findMany({
        where: { characterId: activeCharacter.id },
        select: {
          id: true,
          itemName: true,
          itemId: true,
          isEquipped: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const items = rawItems.map((item) => {
    const definition = SHOP_ITEM_DEFINITION_MAP[item.itemId];
    return {
      ...item,
      slot: definition?.slot ?? "unknown",
      effectLabel: formatStatBonusLabel(definition?.effects?.stats),
    };
  });
  const equippedItems = items.filter((item) => item.isEquipped);
  const statSummary = activeCharacter
    ? getCharacterEffectiveStats(activeCharacter, equippedItems)
    : null;

  return (
    <main>
      <h1>Inventory</h1>
      {activeCharacter ? (
        <>
          <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
          <StatSummary summary={statSummary} />
          <InventoryActions items={items} />
          <p>
            Agda items:
          </p>
          {items.length === 0 ? (
            <p>Inga items an. Kop i butik forst.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  {item.itemName} ({item.slot}) - {item.effectLabel}{" "}
                  {item.isEquipped ? "(equipped)" : ""}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p>
          Du maste skapa en karaktar for att anvanda inventory.{" "}
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
