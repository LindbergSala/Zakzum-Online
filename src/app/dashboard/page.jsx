import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import CharacterOverview from "@/components/character-overview";
import EnergyTimer from "@/components/energy-timer";
import GameNav from "@/components/game-nav";
import ResourceStrip from "@/components/resource-strip";
import { getUserWithResolvedActiveCharacter } from "@/lib/character";
import { getEnergyRegenerationMeta } from "@/lib/energy-regeneration";
import { getLevelProgressMeta } from "@/lib/level-progression";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import styles from "./page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const showDebugLink = process.env.NODE_ENV !== "production";
const DASHBOARD_LOG_ENTRY_LIMIT = 6;

function formatType(type) {
  if (type === "ACTIVITY") {
    return "Activity";
  }

  if (type === "SHOP") {
    return "Shop";
  }

  if (type === "EQUIP") {
    return "Equip";
  }

  return type;
}

function formatDelta(delta) {
  if (!delta || typeof delta !== "object") {
    return "No delta.";
  }

  const parts = Object.entries(delta).map(([key, value]) => {
    const numericValue = Number(value);
    const sign = numericValue > 0 ? "+" : "";
    return `${key}: ${sign}${numericValue}`;
  });

  return parts.join(", ");
}

function formatResources(resources) {
  if (!resources || typeof resources !== "object") {
    return "No resource data.";
  }

  return [
    `HP ${resources.hp}`,
    `Energy ${resources.energy}`,
    `Gold ${resources.gold}`,
    `XP ${resources.xp}`,
    `Level ${resources.level}`,
    `Renown ${resources.renown}`,
    `Heat ${resources.heat}`,
  ].join(" | ");
}

function formatDetails(entry) {
  if (!entry.details || typeof entry.details !== "object") {
    return null;
  }

  const item = entry.details.item;
  if (!item || typeof item !== "object") {
    return null;
  }

  const pricePart =
    typeof item.price === "number" ? `, price ${item.price} Gold` : "";
  return `${item.name ?? entry.activityName} (${item.slot ?? "unknown slot"}${pricePart})`;
}

export default async function DashboardPage() {
  const user = await requirePageUser();
  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);
  const activeCharacter = userWithCharacter?.activeCharacter ?? null;
  const energyMeta = activeCharacter
    ? getEnergyRegenerationMeta(activeCharacter)
    : null;
  const levelProgress = activeCharacter
    ? getLevelProgressMeta(activeCharacter.level, activeCharacter.xp)
    : null;
  const logEntries = activeCharacter
    ? await prisma.activityLog.findMany({
        where: { characterId: activeCharacter.id },
        orderBy: { createdAt: "desc" },
        take: DASHBOARD_LOG_ENTRY_LIMIT,
        select: {
          id: true,
          type: true,
          activityName: true,
          success: true,
          energyCost: true,
          roll: true,
          rollTotal: true,
          successTarget: true,
          statModifier: true,
          chancePercent: true,
          delta: true,
          afterResources: true,
          details: true,
          createdAt: true,
        },
      })
    : [];

  return (
    <div className={`${styles.pageShell} ${bodyFont.className}`}>
      <main className={styles.main}>
        <GameNav />
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>Adventurer Command Center</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>Dashboard</h1>
            <p className={styles.lead}>
              You are logged in as <strong>{user.email}</strong>. Keep the momentum
              going and push your character forward.
            </p>
          </header>

          {activeCharacter ? (
            <div className={styles.panelGrid}>
              <section className={styles.panel}>
                <h2>Current status</h2>
                <p className={styles.muted}>
                  Active character loaded automatically on login.
                </p>
                <div className={styles.metricCard}>
                  <ResourceStrip
                    resources={getCharacterResourceSnapshot(activeCharacter)}
                  />
                </div>
                <div className={styles.metricCard}>
                  <EnergyTimer
                    key={energyMeta?.nextEnergyAt ?? "energy-full"}
                    energyMeta={energyMeta}
                  />
                </div>
                <p className={styles.progression}>
                  <strong>Progression:</strong> Level {levelProgress.level} | XP{" "}
                  {levelProgress.xp} | Next level at{" "}
                  {levelProgress.nextLevelXpTarget} XP (
                  {levelProgress.xpToNextLevel} remaining)
                </p>
                <hr className={styles.sectionDivider} />
                <h3 className={styles.panelSubheading}>Character overview</h3>
                <CharacterOverview character={activeCharacter} />
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeadingRow}>
                  <h2>Recent activity log</h2>
                  <Link className={styles.inlineLink} href="/log">
                    Open full log
                  </Link>
                </div>
                {logEntries.length === 0 ? (
                  <p>No actions logged yet.</p>
                ) : (
                  <ul className={styles.logList}>
                    {logEntries.map((entry) => (
                      <li className={styles.logItem} key={entry.id}>
                        <p className={styles.logTopLine}>
                          <strong>{entry.activityName}</strong> (
                          {formatType(entry.type)}) -{" "}
                          {entry.success ? "SUCCESS" : "FAIL"} -{" "}
                          {new Date(entry.createdAt).toLocaleString("en-US")}
                        </p>
                        {entry.type === "ACTIVITY" ? (
                          <p className={styles.logDetail}>
                            Roll: {entry.roll} + mod {entry.statModifier} ={" "}
                            {entry.rollTotal} (target {entry.successTarget}, chance{" "}
                            {entry.chancePercent}%) | Energy cost: {entry.energyCost}
                          </p>
                        ) : (
                          <p className={styles.logDetail}>
                            Result: {entry.success ? "OK" : "FAIL"}
                            {formatDetails(entry)
                              ? ` | ${formatDetails(entry)}`
                              : ""}
                          </p>
                        )}
                        <p className={styles.logDetail}>
                          Delta: {formatDelta(entry.delta)}
                        </p>
                        <p className={styles.logDetail}>
                          New totals: {formatResources(entry.afterResources)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className={`${styles.panel} ${styles.panelWide}`}>
                <h2>Quick actions</h2>
                <div className={styles.actionGrid}>
                  <Link className={styles.actionLink} href="/character">
                    Character
                  </Link>
                  <Link className={styles.actionLink} href="/activities">
                    Activities
                  </Link>
                  <Link className={styles.actionLink} href="/shop">
                    Shop
                  </Link>
                  <Link className={styles.actionLink} href="/inventory">
                    Inventory
                  </Link>
                  <Link className={styles.actionLink} href="/log">
                    Log
                  </Link>
                  {showDebugLink ? (
                    <Link className={styles.actionLink} href="/debug">
                      Debug
                    </Link>
                  ) : null}
                </div>
              </section>
            </div>
          ) : (
            <section className={`${styles.panel} ${styles.emptyState}`}>
              <h2>No active character yet</h2>
              <p>
                You need to create your first character before you can use the core
                game loop.
              </p>
              <Link className={styles.primaryAction} href="/character/create">
                Create character
              </Link>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}
