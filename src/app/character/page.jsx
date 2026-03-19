import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import CharacterOverview from "@/components/character-overview";
import DeleteCharacterForm from "@/components/delete-character-form";
import EnergyTimer from "@/components/energy-timer";
import GameNav from "@/components/game-nav";
import InventoryHydrated from "@/components/inventory/InventoryHydrated";
import StatPointAllocator from "@/components/stat-point-allocator";
import {
  buildBaseResourcesForCharacter,
  getUserWithResolvedActiveCharacter,
} from "@/lib/character";
import { SHOP_ITEM_DEFINITION_MAP } from "@/lib/core-loop-data";
import { getEnergyRegenerationMeta } from "@/lib/energy-regeneration";
import { getLevelProgressMeta } from "@/lib/level-progression";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { formatStatBonusLabel } from "@/lib/stat-effects";
import { getCharacterCarryWeightSummary } from "@/lib/weight-rules";
import styles from "./page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const SAFE_HEAT_LIMIT = 10;

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getCharacterMaxResources(character) {
  const baseResources = buildBaseResourcesForCharacter(
    character.characterClass,
    character.constitution,
  );

  return {
    maxHp: Math.max(1, baseResources.hp, Number(character.hp) || 0),
    maxEnergy: Math.max(
      1,
      baseResources.maxEnergy,
      Number(character.maxEnergy) || 0,
      Number(character.energy) || 0,
    ),
  };
}

function buildCharacterGoalCards(character, levelProgress, carryWeightSummary) {
  const levelProgressPercent = clampPercent(
    (levelProgress.xp / levelProgress.nextLevelXpTarget) * 100,
  );
  const heatProgressPercent = clampPercent(
    ((SAFE_HEAT_LIMIT - character.heat) / SAFE_HEAT_LIMIT) * 100,
  );
  const isHeatInSafeRange = character.heat <= SAFE_HEAT_LIMIT;

  return [
    {
      id: "level",
      label: `Level ${levelProgress.level} -> ${levelProgress.level + 1}`,
      value: `${levelProgress.xpToNextLevel} XP remaining`,
      hint: `${levelProgress.xp}/${levelProgress.nextLevelXpTarget} XP`,
      progressPercent: levelProgressPercent,
    },
    {
      id: "heat",
      label: "Heat control",
      value: isHeatInSafeRange
        ? `Safe range (${character.heat}/${SAFE_HEAT_LIMIT})`
        : `${character.heat - SAFE_HEAT_LIMIT} above safe range`,
      hint: isHeatInSafeRange
        ? `${SAFE_HEAT_LIMIT - character.heat} margin left`
        : "Consider low-risk actions to stabilize",
      progressPercent: heatProgressPercent,
    },
    {
      id: "weight",
      label: "Carry weight",
      value: `${carryWeightSummary.currentWeight}/${carryWeightSummary.maxWeight} Wt`,
      hint:
        carryWeightSummary.remainingWeight >= 0
          ? `${carryWeightSummary.remainingWeight} Wt free`
          : `${Math.abs(carryWeightSummary.remainingWeight)} Wt over limit`,
      progressPercent: carryWeightSummary.usagePercent,
    },
  ];
}

export default async function CharacterPage() {
  const user = await requirePageUser();
  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);
  const character = userWithCharacter?.activeCharacter ?? null;
  const rawItems = character
    ? await prisma.characterItem.findMany({
        where: {
          characterId: character.id,
        },
        select: {
          id: true,
          itemId: true,
          itemName: true,
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
      weight: definition?.weight ?? 0,
      effectLabel: formatStatBonusLabel(definition?.effects?.stats),
    };
  });
  const carryWeightSummary = character
    ? getCharacterCarryWeightSummary(character.strength, items)
    : null;
  const levelProgress = character
    ? getLevelProgressMeta(character.level, character.xp)
    : null;
  const energyMeta = character
    ? getEnergyRegenerationMeta(character)
    : null;
  const maxResources = character ? getCharacterMaxResources(character) : null;
  const hpPercent = maxResources
    ? clampPercent((character.hp / maxResources.maxHp) * 100)
    : 0;
  const energyPercent = maxResources
    ? clampPercent((character.energy / maxResources.maxEnergy) * 100)
    : 0;
  const goalCards =
    character && levelProgress && carryWeightSummary
      ? buildCharacterGoalCards(character, levelProgress, carryWeightSummary)
      : [];
  const inventoryStateKey = character
    ? `${character.id}:${items
        .map((item) => `${item.id}-${item.isEquipped ? 1 : 0}`)
        .join("|")}`
    : "inventory-empty";

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
            <h1 className={`${styles.title} ${headingFont.className}`}>{character.name}</h1>
            <p className={styles.lead}>
              Review your class identity and manage equipment in one place.
            </p>
          </header>

          <section className={styles.panel}>
            <h2>Current status</h2>
            <p className={styles.muted}>
              Keep track of survivability and progression before your next run.
            </p>

            <div className={styles.resourceMeters}>
              <article className={styles.resourceCard}>
                <div className={styles.resourceTop}>
                  <p className={styles.resourceLabel}>HP</p>
                  <p className={styles.resourceValue}>
                    {character.hp}/{maxResources.maxHp}
                  </p>
                </div>
                <div className={styles.goalTrack} aria-hidden="true">
                  <span
                    className={`${styles.goalFill} ${styles.hpFill}`}
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
              </article>

              <article className={styles.resourceCard}>
                <div className={styles.resourceTop}>
                  <p className={styles.resourceLabel}>
                    Energy{" "}
                    <EnergyTimer
                      key={energyMeta?.nextEnergyAt ?? "energy-full-inline-character"}
                      energyMeta={energyMeta}
                      variant="inline"
                      className={styles.resourceLabelMeta}
                    />
                  </p>
                  <p className={styles.resourceValue}>
                    {character.energy}/{maxResources.maxEnergy}
                  </p>
                </div>
                <div className={styles.goalTrack} aria-hidden="true">
                  <span
                    className={`${styles.goalFill} ${styles.energyFill}`}
                    style={{ width: `${energyPercent}%` }}
                  />
                </div>
              </article>
            </div>

            <ul className={styles.goalGrid}>
              {goalCards.map((goal) => (
                <li className={styles.goalCard} key={goal.id}>
                  <p className={styles.goalLabel}>{goal.label}</p>
                  <p className={styles.goalValue}>{goal.value}</p>
                  <p className={styles.goalHint}>{goal.hint}</p>
                  <div className={styles.goalTrack} aria-hidden="true">
                    <span
                      className={styles.goalFill}
                      style={{ width: `${goal.progressPercent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>

            {character.unspentStatPoints > 0 ? (
              <StatPointAllocator character={character} />
            ) : (
              <p className={styles.mutedSecondary}>
                No unspent stat points. Gain XP and level up to earn +1 stat point.
              </p>
            )}

            <hr className={styles.sectionDivider} />
            <h2>Character overview</h2>
            <CharacterOverview character={character} showResources={false} />
            <p className={styles.backLink}>
              <Link href="/dashboard">Back to dashboard</Link>
            </p>
            <DeleteCharacterForm />
          </section>

          <section id="inventory" className={styles.inventorySection}>
            <InventoryHydrated
              key={inventoryStateKey}
              characterId={character.id}
              items={items}
            />
          </section>
        </section>
      </main>
    </div>
  );
}
