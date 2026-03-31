import Link from "next/link";
import { notFound } from "next/navigation";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import GameNav from "@/components/game-nav";
import InventoryHydrated from "@/components/inventory/inventory-hydrated";
import ShopActions from "@/components/shop-actions";
import { getActiveCharacterForUser } from "@/lib/character";
import {
  getItemById,
  getItemMarketIds,
  getItemsForMarket,
  getShopItemGoldCost,
  getShopItemRenownCost,
  getShopItemSellValue,
  isShopItemStackable,
} from "@/lib/items/helpers";
import { MARKET_DEFINITION_MAP } from "@/lib/market-data";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { formatItemEffectLabel } from "@/lib/stat-effects";
import { getCharacterCarryWeightSummary } from "@/lib/weight-rules";
import styles from "../page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const marketShellClassById = {
  "blacksmith-forge": "blacksmithPageShell",
  "alchemist-lab": "alchemistPageShell",
  "arcanist-sanctum": "arcanistPageShell",
  "shadow-bazaar": "bazaarPageShell",
  "trophy-merchant": "trophyPageShell",
  "leathermaker-workshop": "leathermakerPageShell",
};

function summarizeOwnedByItemId(ownedItems = []) {
  const summary = {};

  for (const item of ownedItems) {
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const current = summary[item.itemId] ?? {
      quantity: 0,
      equipped: false,
    };

    current.quantity += quantity;
    current.equipped = current.equipped || Boolean(item.isEquipped);
    summary[item.itemId] = current;
  }

  return summary;
}

export default async function MarketVendorPage({ params }) {
  const resolvedParams = await params;
  const market = MARKET_DEFINITION_MAP[resolvedParams.marketId];

  if (!market) {
    notFound();
  }

  const user = await requirePageUser();
  const activeCharacter = await getActiveCharacterForUser(user.id);
  const ownedItemsSummary = activeCharacter
    ? await prisma.characterItem.findMany({
        where: { characterId: activeCharacter.id },
        select: {
          itemId: true,
          isEquipped: true,
          quantity: true,
        },
      })
    : [];
  const ownedItems = activeCharacter
    ? await prisma.characterItem.findMany({
        where: { characterId: activeCharacter.id },
        select: {
          id: true,
          itemId: true,
          itemName: true,
          quantity: true,
          isEquipped: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const ownedById = summarizeOwnedByItemId(ownedItemsSummary);
  const carryWeightSummary = activeCharacter
    ? getCharacterCarryWeightSummary(activeCharacter.strength, ownedItemsSummary)
    : null;

  const vendorItems = getItemsForMarket(market.id);
  const shopItems = vendorItems.map((item) => ({
    id: item.id,
    name: item.name,
    marketId: getItemMarketIds(item)[0] ?? null,
    marketIds: getItemMarketIds(item),
    description: item.description,
    price: getShopItemGoldCost(item),
    renownPrice: getShopItemRenownCost(item),
    weight: item.weight,
    slot: item.slot,
    effects: item.effects,
    effectLabel: formatItemEffectLabel(item.effects),
    owned: (Number(ownedById[item.id]?.quantity) || 0) > 0,
    ownedQuantity: Number(ownedById[item.id]?.quantity) || 0,
    equipped: Boolean(ownedById[item.id]?.equipped),
    sellValue: getShopItemSellValue(item),
    isStackable: isShopItemStackable(item),
  }));
  const inventoryItems = ownedItems.map((item) => {
    const definition = getItemById(item.itemId);
    return {
      ...item,
      slot: definition?.slot ?? "unknown",
      weight: definition?.weight ?? 0,
      effectLabel: formatItemEffectLabel(definition?.effects),
      sellValue: getShopItemSellValue(definition),
    };
  });
  const inventoryStateKey = activeCharacter
    ? `${activeCharacter.id}:${inventoryItems
        .map((item) => `${item.id}-${item.isEquipped ? 1 : 0}-${item.quantity}`)
        .join("|")}`
    : "market-inventory-empty";
  const pageShellClassName = [
    styles.pageShell,
    bodyFont.className,
    marketShellClassById[market.id] ? styles[marketShellClassById[market.id]] : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={pageShellClassName}>
      <main className={styles.main}>
        <GameNav />
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>Market Vendor</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>{market.name}</h1>
            <p className={styles.lead}>{market.summary}</p>
          </header>

          <section className={styles.panel}>
            <h2>Vendor stock</h2>
            <p className={styles.muted}>
              {market.status === "open"
                ? "Browse available items and optimize your loadout."
                : "This vendor is temporarily closed while caravans restock routes."}
            </p>
            {!activeCharacter ? (
              <p>
                You must create a character before you can use the market.{" "}
                <Link href="/character/create">Create character</Link>.
              </p>
            ) : market.supportsPurchases ? (
              <>
                <div className={styles.vendorMetrics}>
                  <article className={styles.vendorMetric}>
                    <p className={styles.vendorMetricLabel}>Gold</p>
                    <p className={styles.vendorMetricValue}>{activeCharacter.gold}</p>
                  </article>
                  <article className={styles.vendorMetric}>
                    <p className={styles.vendorMetricLabel}>Carry weight</p>
                    <p className={styles.vendorMetricValue}>
                      {carryWeightSummary.currentWeight}/{carryWeightSummary.maxWeight}
                    </p>
                    {carryWeightSummary.carryBonus > 0 ? (
                      <p className={styles.vendorMetricMeta}>
                        Base {carryWeightSummary.baseCapacity} + bonus {carryWeightSummary.carryBonus}
                      </p>
                    ) : null}
                  </article>
                </div>
                <div className={styles.inventorySection}>
                  <h3 className={styles.sectionHeading}>Inventory</h3>
                  <InventoryHydrated
                    key={inventoryStateKey}
                    characterId={activeCharacter.id}
                    items={inventoryItems}
                    enableSellDropzone
                  />
                </div>
                <h3 className={styles.sectionHeading}>Market offers</h3>
                {shopItems.length > 0 ? (
                  <div className={styles.actionsWrap}>
                    <ShopActions
                      items={shopItems}
                      marketId={market.id}
                    />
                  </div>
                ) : (
                  <p className={styles.emptyState}>This vendor has no stock yet.</p>
                )}
              </>
            ) : (
              <p>This vendor is currently unavailable. Check back after restock rotation.</p>
            )}
            <p className={styles.backLink}>
              <Link href="/market">Back to market</Link>
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
