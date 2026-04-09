import Link from "next/link";
import { notFound } from "next/navigation";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import GameNav from "@/components/game-nav";
import InventoryHydrated from "@/components/inventory/inventory-hydrated";
import RestLockBanner from "@/components/rest-lock-banner";
import ShopActions from "@/components/shop-actions";
import { getResolvedActiveCharacterForUser } from "@/lib/character";
import { getCharacterHeatRestMeta } from "@/lib/heat-rest";
import {
  getItemById,
  getItemGoldCost,
  getItemMarketIds,
  getItemRenownCost,
  getItemSellValue,
  getItemsForMarket,
  isItemStackable,
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

function buildRecommendedBuy(shopItems, activeCharacter, carryWeightSummary) {
  if (!activeCharacter || !carryWeightSummary) {
    return null;
  }

  const affordableItems = shopItems.filter((item) => {
    const price = Number(item.price) || 0;
    const weight = Number(item.weight) || 0;
    return price <= activeCharacter.gold && weight <= carryWeightSummary.remainingWeight;
  });

  if (affordableItems.length === 0) {
    return null;
  }

  const preferredItem = affordableItems
    .filter((item) => !item.owned || item.isStackable)
    .sort((left, right) => {
      if (left.isStackable !== right.isStackable) {
        return left.isStackable ? 1 : -1;
      }

      return (Number(left.price) || 0) - (Number(right.price) || 0);
    })[0];

  return preferredItem ?? affordableItems[0] ?? null;
}

function buildSellRecommendations(inventoryItems = [], carryWeightSummary = null) {
  const candidates = inventoryItems
    .filter((item) => !item.isEquipped)
    .map((item) => ({
      ...item,
      totalGoldValue: (Number(item.sellValue?.gold) || 0) * Math.max(1, Number(item.quantity) || 1),
      totalWeight: (Number(item.weight) || 0) * Math.max(1, Number(item.quantity) || 1),
    }))
    .filter((item) => item.totalGoldValue > 0 || item.totalWeight > 0)
    .sort((left, right) => {
      if (right.totalWeight !== left.totalWeight) {
        return right.totalWeight - left.totalWeight;
      }

      return right.totalGoldValue - left.totalGoldValue;
    })
    .slice(0, 3);

  if (candidates.length === 0) {
    return [];
  }

  return candidates.map((item, index) => ({
    itemId: item.itemId,
    label:
      carryWeightSummary?.remainingWeight <= 3 || carryWeightSummary?.isOverweight
        ? index === 0
          ? "Strong sell candidate: frees the most room immediately."
          : "Good sell candidate if you need room fast."
        : "Optional sell candidate if you want more Gold and space.",
  }));
}

function buildTradeDecision({ activeCharacter, carryWeightSummary, shopItems }) {
  if (!activeCharacter || !carryWeightSummary) {
    return null;
  }

  const cheapestPrice = shopItems.reduce((lowest, item) => {
    const price = Number(item.price) || 0;
    if (price <= 0) {
      return lowest;
    }

    return lowest === null ? price : Math.min(lowest, price);
  }, null);

  if (carryWeightSummary.isOverweight) {
    return {
      tone: "warn",
      title: "Sell first",
      summary: `You are carrying ${Math.abs(carryWeightSummary.remainingWeight)} Wt too much. Clear weight before new purchases or loot.`,
    };
  }

  if (carryWeightSummary.remainingWeight <= 3) {
    return {
      tone: "warn",
      title: "Weight room is almost gone",
      summary: `Only ${carryWeightSummary.remainingWeight} Wt remains. Prioritize selling or skip heavy upgrades for now.`,
    };
  }

  if (cheapestPrice !== null && activeCharacter.gold < cheapestPrice) {
    return {
      tone: "warn",
      title: "Gold is the blocker",
      summary: `Cheapest available purchase starts at ${cheapestPrice} Gold. Sell extras or run another activity first.`,
    };
  }

  return {
    tone: "ok",
    title: "Good market window",
    summary: "You have enough room to buy selectively. Favor upgrades that solve the next bottleneck, not just the lowest price.",
  };
}

export default async function MarketVendorPage({ params }) {
  const resolvedParams = await params;
  const market = MARKET_DEFINITION_MAP[resolvedParams.marketId];

  if (!market) {
    notFound();
  }

  const user = await requirePageUser();
  const activeCharacter = await getResolvedActiveCharacterForUser(user.id);
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
    price: getItemGoldCost(item, activeCharacter),
    renownPrice: getItemRenownCost(item, activeCharacter),
    weight: item.weight,
    slot: item.slot,
    effects: item.effects,
    effectLabel: formatItemEffectLabel(item.effects),
    owned: (Number(ownedById[item.id]?.quantity) || 0) > 0,
    ownedQuantity: Number(ownedById[item.id]?.quantity) || 0,
    equipped: Boolean(ownedById[item.id]?.equipped),
    sellValue: getItemSellValue(item, activeCharacter),
    isStackable: isItemStackable(item),
  }));
  const inventoryItems = ownedItems.map((item) => {
    const definition = getItemById(item.itemId);
    return {
      ...item,
      slot: definition?.slot ?? "unknown",
      weight: definition?.weight ?? 0,
      effectLabel: formatItemEffectLabel(definition?.effects),
      sellValue: getItemSellValue(definition, activeCharacter),
    };
  });
  const recommendedBuy = buildRecommendedBuy(
    shopItems,
    activeCharacter,
    carryWeightSummary,
  );
  const sellRecommendations = buildSellRecommendations(
    inventoryItems,
    carryWeightSummary,
  );
  const sellRecommendationMap = Object.fromEntries(
    sellRecommendations.map((entry) => [entry.itemId, entry.label]),
  );
  const inventoryItemsWithTradeNotes = inventoryItems.map((item) => ({
    ...item,
    tradeNote: sellRecommendationMap[item.itemId] ?? "",
  }));
  const inventoryStateKey = activeCharacter
    ? `${activeCharacter.id}:${inventoryItemsWithTradeNotes
        .map((item) => `${item.id}-${item.isEquipped ? 1 : 0}-${item.quantity}`)
        .join("|")}`
    : "market-inventory-empty";
  const heatRestMeta = activeCharacter ? getCharacterHeatRestMeta(activeCharacter) : null;
  const tradeDecision = buildTradeDecision({
    activeCharacter,
    carryWeightSummary,
    shopItems,
  });
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
            ) : heatRestMeta?.isResting ? (
              <RestLockBanner areaLabel={market.name} />
            ) : market.supportsPurchases ? (
              <>
                {tradeDecision ? (
                  <section
                    className={`${styles.tradeDecision} ${
                      tradeDecision.tone === "warn"
                        ? styles.tradeDecisionWarn
                        : styles.tradeDecisionOk
                    }`}
                  >
                    <p className={styles.tradeDecisionKicker}>Trade priority</p>
                    <h3 className={styles.tradeDecisionTitle}>{tradeDecision.title}</h3>
                    <p className={styles.tradeDecisionSummary}>{tradeDecision.summary}</p>
                  </section>
                ) : null}

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
                  {sellRecommendations.length > 0 ? (
                    <section className={styles.tradeRecommendationList}>
                      <p className={styles.tradeRecommendationTitle}>Sell candidates</p>
                      <ul className={styles.tradeRecommendationItems}>
                        {sellRecommendations.map((entry) => (
                          <li key={entry.itemId}>{entry.label}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  <InventoryHydrated
                    key={inventoryStateKey}
                    characterId={activeCharacter.id}
                    items={inventoryItemsWithTradeNotes}
                    enableSellDropzone
                    carrySummary={carryWeightSummary}
                  />
                </div>
                <h3 className={styles.sectionHeading}>Market offers</h3>
                {recommendedBuy ? (
                  <section className={styles.tradeRecommendationList}>
                    <p className={styles.tradeRecommendationTitle}>Recommended next buy</p>
                    <p className={styles.tradeRecommendationLead}>
                      {recommendedBuy.name}: affordable now, fits your current carry room, and is a better next purchase than waiting for a random buy.
                    </p>
                  </section>
                ) : null}
                {shopItems.length > 0 ? (
                  <div className={styles.actionsWrap}>
                    <ShopActions
                      items={shopItems}
                      marketId={market.id}
                      currentGold={activeCharacter.gold}
                      remainingWeight={carryWeightSummary.remainingWeight}
                      recommendedItemId={recommendedBuy?.id ?? ""}
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
              <Link href="/market" aria-label="Back to market">
                &larr;
              </Link>
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
