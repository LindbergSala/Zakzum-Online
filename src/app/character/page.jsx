import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import CharacterOverview from "@/components/character-overview";
import GameNav from "@/components/game-nav";
import { getUserWithResolvedActiveCharacter } from "@/lib/character";
import { SHOP_ITEM_DEFINITION_MAP, SHOP_ITEM_DEFINITIONS } from "@/lib/core-loop-data";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { formatStatBonusLabel } from "@/lib/stat-effects";
import { getTotalItemWeight } from "@/lib/weight-rules";
import styles from "./page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const EQUIPMENT_SLOTS = Array.from(
  new Set(SHOP_ITEM_DEFINITIONS.map((item) => item.slot)),
);

const SLOT_ICON_BY_SLOT = {
  weapon: "WPN",
  armor: "ARM",
  helmet: "HLM",
  shield: "SHD",
  gloves: "GLV",
  boots: "BTS",
  belt: "BLT",
  ring: "RNG",
  trinket: "TRK",
};

function formatSlotLabel(slot) {
  if (!slot) {
    return "Unknown";
  }

  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

function getSlotIcon(slot) {
  return SLOT_ICON_BY_SLOT[slot] ?? "SLT";
}

export default async function CharacterPage() {
  const user = await requirePageUser();
  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);
  const character = userWithCharacter?.activeCharacter ?? null;
  const equippedItems = character
    ? await prisma.characterItem.findMany({
        where: {
          characterId: character.id,
          isEquipped: true,
        },
        select: {
          id: true,
          itemId: true,
          itemName: true,
        },
      })
    : [];
  const equippedItemsBySlot = Object.fromEntries(
    equippedItems.map((item) => {
      const definition = SHOP_ITEM_DEFINITION_MAP[item.itemId];
      return [
        definition?.slot ?? "unknown",
        {
          ...item,
          slot: definition?.slot ?? "unknown",
          weight: definition?.weight ?? 0,
          effectLabel: formatStatBonusLabel(definition?.effects?.stats),
        },
      ];
    }),
  );
  const equippedWeight = getTotalItemWeight(equippedItems);
  const equippedSlotCount = EQUIPMENT_SLOTS.filter(
    (slot) => Boolean(equippedItemsBySlot[slot]),
  ).length;

  if (!character) {
    return (
      <div className={`${styles.pageShell} ${bodyFont.className}`}>
        <main className={styles.main}>
          <GameNav />
          <section className={styles.heroCard}>
            <header className={styles.heroIntro}>
              <p className={styles.kicker}>Hero Profile</p>
              <h1 className={`${styles.title} ${headingFont.className}`}>
                Character overview
              </h1>
              <p className={styles.lead}>
                You do not have an active character yet.
              </p>
            </header>

            <section className={`${styles.panel} ${styles.emptyState}`}>
              <h2>Create your hero</h2>
              <p>
                Set up your first character to unlock activities, progression and
                inventory.
              </p>
              <Link className={styles.primaryAction} href="/character/create">
                Create character
              </Link>
            </section>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={`${styles.pageShell} ${bodyFont.className}`}>
      <main className={styles.main}>
        <GameNav />
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>Hero Profile</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>
              Character overview
            </h1>
            <p className={styles.lead}>
              Review your class identity, base stats and current hero build.
            </p>
          </header>

          <div className={styles.panelGrid}>
            <section className={`${styles.panel} ${styles.panelInGrid}`}>
              <CharacterOverview character={character} />
              <p className={styles.backLink}>
                <Link href="/dashboard">Back to dashboard</Link>
              </p>
            </section>

            <section
              className={`${styles.panel} ${styles.panelInGrid} ${styles.equipmentPanel}`}
            >
              <div className={styles.equipmentFrame}>
                <div className={styles.equipmentHeader}>
                  <h2>Equipped items</h2>
                  <p className={styles.equipmentMeta}>
                    {equippedSlotCount}/{EQUIPMENT_SLOTS.length} slots equipped
                  </p>
                </div>
                <ul className={styles.slotGrid}>
                  {EQUIPMENT_SLOTS.map((slot) => {
                    const item = equippedItemsBySlot[slot];

                    return (
                      <li className={styles.slotCard} key={slot}>
                        <div className={styles.slotTopRow}>
                          <div className={styles.slotTitleWrap}>
                            <span className={styles.slotIcon} aria-hidden="true">
                              {getSlotIcon(slot)}
                            </span>
                            <p className={styles.slotName}>{formatSlotLabel(slot)}</p>
                          </div>
                          <span
                            className={
                              item ? styles.slotStateEquipped : styles.slotStateEmpty
                            }
                          >
                            {item ? "equipped" : "empty"}
                          </span>
                        </div>
                        {item ? (
                          <>
                            <p className={styles.slotItemName}>{item.itemName}</p>
                            <p className={styles.slotItemMeta}>{item.effectLabel}</p>
                            <p className={styles.slotItemMeta}>
                              Weight: {item.weight} Wt
                            </p>
                          </>
                        ) : (
                          <p className={styles.slotEmpty}>No item in this slot</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className={styles.equipmentSummary}>
                  Total equipped weight: <strong>{equippedWeight} Wt</strong>
                </p>
              </div>
              <p className={`${styles.backLink} ${styles.equipmentLink}`}>
                <Link href="/inventory">Manage equipment in inventory</Link>
              </p>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
