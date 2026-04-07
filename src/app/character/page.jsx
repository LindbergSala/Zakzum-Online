import Link from "next/link";
import Image from "next/image";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import CharacterOverview from "@/components/character-overview";
import RestControls from "@/components/rest-controls";
import StaminaTimer from "@/components/stamina-timer";
import GameNav from "@/components/game-nav";
import InventoryHydrated from "@/components/inventory/inventory-hydrated";
import StatPointAllocator from "@/components/stat-point-allocator";
import {
  buildBaseResourcesForCharacter,
  getUserWithResolvedActiveCharacter,
} from "@/lib/character";
import { getResolvedCharacterAvatar } from "@/lib/character-avatars";
import {
  getStaminaRegenerationMeta,
  getHpRegenerationMeta,
} from "@/lib/stamina-regeneration";
import { getCharacterHeatRestMeta } from "@/lib/heat-rest";
import { getItemById } from "@/lib/items/helpers";
import { getLevelProgressMeta } from "@/lib/level-progression";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { getHeatRollModifier, getNextHeatThreshold } from "@/lib/roll-engine";
import { formatItemEffectLabel } from "@/lib/stat-effects";
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
    maxStamina: Math.max(
      1,
      baseResources.maxStamina,
      Number(character.maxStamina) || 0,
      Number(character.stamina) || 0,
    ),
  };
}

function buildCharacterGoalCards(character, levelProgress, carryWeightSummary) {
  const currentHeat = Number(character.heat) || 0;
  const heatRollModifier = getHeatRollModifier(currentHeat);
  const nextHeatThreshold = getNextHeatThreshold(currentHeat);
  const levelProgressPercent = clampPercent(
    (levelProgress.xp / levelProgress.nextLevelXpTarget) * 100,
  );
  const heatProgressPercent = clampPercent(
    (Math.max(0, 100 - currentHeat) / 100) * 100,
  );

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
      value: `Heat ${currentHeat} | Roll ${heatRollModifier >= 0 ? "+0" : heatRollModifier}`,
      hint: nextHeatThreshold
        ? `${nextHeatThreshold.minimumHeat - currentHeat} Heat until ${nextHeatThreshold.rollModifier}`
        : "Maximum Heat penalty reached",
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
          quantity: true,
          isEquipped: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const items = rawItems.map((item) => {
    const definition = getItemById(item.itemId);
    return {
      ...item,
      slot: definition?.slot ?? "unknown",
      weight: definition?.weight ?? 0,
      effectLabel: formatItemEffectLabel(definition?.effects),
    };
  });
  const carryWeightSummary = character
    ? getCharacterCarryWeightSummary(character.strength, items)
    : null;
  const levelProgress = character
    ? getLevelProgressMeta(character.level, character.xp)
    : null;
  const staminaMeta = character
    ? getStaminaRegenerationMeta(character)
    : null;
  const hpMeta = character
    ? getHpRegenerationMeta(character)
    : null;
  const heatRestMeta = character
    ? getCharacterHeatRestMeta(character)
    : null;
  const maxResources = character ? getCharacterMaxResources(character) : null;
  const hpPercent = maxResources
    ? clampPercent((character.hp / maxResources.maxHp) * 100)
    : 0;
  const staminaPercent = maxResources
    ? clampPercent((character.stamina / maxResources.maxStamina) * 100)
    : 0;
  const goalCards =
    character && levelProgress && carryWeightSummary
      ? buildCharacterGoalCards(character, levelProgress, carryWeightSummary)
      : [];
  const inventoryStateKey = character
    ? `${character.id}:${items
        .map((item) => `${item.id}-${item.isEquipped ? 1 : 0}-${item.quantity}`)
        .join("|")}`
    : "inventory-empty";
  const characterAvatarImage = getResolvedCharacterAvatar(character);

  if (!character) {
    return (
      <div className={`${styles.pageShell} ${bodyFont.className}`}>
        <main className={styles.main}>
          <GameNav />
          <section className={styles.heroCard}>
            <header className={styles.heroIntro}>
              <p className={styles.kicker}>Character Overview</p>
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
            <p className={styles.kicker}>Character Overview</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>{character.name}</h1>
            {characterAvatarImage ? (
              <div className={styles.headerPortraitWrap}>
                <Image
                  src={characterAvatarImage}
                  alt={`${character.name} portrait`}
                  width={230}
                  height={230}
                  className={styles.headerPortrait}
                  priority
                />
              </div>
            ) : null}
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
                  <p className={styles.resourceLabel}>
                    HP{" "}
                    <StaminaTimer
                      key={hpMeta?.nextHpAt ?? "hp-full-inline-character"}
                      resourceMeta={hpMeta}
                      resourceLabel="HP"
                      showDepletedNotice
                      variant="inline"
                      className={styles.resourceLabelMeta}
                    />
                  </p>
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
                    Stamina{" "}
                    <StaminaTimer
                      key={staminaMeta?.nextStaminaAt ?? "stamina-full-inline-character"}
                      staminaMeta={staminaMeta}
                      resourceLabel="Stamina"
                      variant="inline"
                      className={styles.resourceLabelMeta}
                    />
                  </p>
                  <p className={styles.resourceValue}>
                    {character.stamina}/{maxResources.maxStamina}
                  </p>
                </div>
                <div className={styles.goalTrack} aria-hidden="true">
                  <span
                    className={`${styles.goalFill} ${styles.energyFill}`}
                    style={{ width: `${staminaPercent}%` }}
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

            <RestControls
              currentHeat={Number(character.heat) || 0}
              restMeta={heatRestMeta}
            />

            {character.unspentStatPoints > 0 ? (
              <StatPointAllocator character={character} />
            ) : (
              <p className={styles.mutedSecondary}>No unspent stat points.</p>
            )}

            <hr className={styles.sectionDivider} />
            <h2>Character overview</h2>
            <CharacterOverview
              character={character}
              showResources={false}
              equippedItems={items.filter((item) => item.isEquipped)}
            />
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
