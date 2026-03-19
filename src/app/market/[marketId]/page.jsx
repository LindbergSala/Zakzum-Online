import Link from "next/link";
import { notFound } from "next/navigation";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import GameNav from "@/components/game-nav";
import ResourceStrip from "@/components/resource-strip";
import ShopActions from "@/components/shop-actions";
import { getActiveCharacterForUser } from "@/lib/character";
import { SHOP_ITEM_DEFINITIONS } from "@/lib/core-loop-data";
import { MARKET_DEFINITION_MAP } from "@/lib/market-data";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
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

export default async function MarketVendorPage({ params }) {
  const resolvedParams = await params;
  const market = MARKET_DEFINITION_MAP[resolvedParams.marketId];

  if (!market) {
    notFound();
  }

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

  const vendorItems = SHOP_ITEM_DEFINITIONS.filter(
    (item) => item.marketId === market.id,
  );
  const shopItems = vendorItems.map((item) => ({
    id: item.id,
    name: item.name,
    marketId: item.marketId,
    description: item.description,
    price: item.price,
    renownPrice: item.renownPrice ?? 0,
    weight: item.weight,
    slot: item.slot,
    effects: item.effects,
    effectLabel: formatItemEffectLabel(item.effects),
    owned: Boolean(ownedById[item.id]),
    equipped: Boolean(ownedById[item.id]?.isEquipped),
  }));
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
                : "This vendor is not open yet."}
            </p>
            {!activeCharacter ? (
              <p>
                You must create a character before you can use the market.{" "}
                <Link href="/character/create">Create character</Link>.
              </p>
            ) : market.supportsPurchases ? (
              <>
                <div className={styles.metricCard}>
                  <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
                </div>
                <p className={styles.carryLabel}>
                  <strong>Carry weight:</strong> {carryWeightSummary.currentWeight}/
                  {carryWeightSummary.maxWeight}
                  {carryWeightSummary.carryBonus > 0
                    ? ` (base ${carryWeightSummary.baseCapacity} + bonus ${carryWeightSummary.carryBonus})`
                    : ""}
                </p>
                {shopItems.length > 0 ? (
                  <div className={styles.actionsWrap}>
                    <ShopActions items={shopItems} />
                  </div>
                ) : (
                  <p className={styles.emptyState}>This vendor has no stock yet.</p>
                )}
              </>
            ) : (
              <p>This vendor is coming soon.</p>
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
