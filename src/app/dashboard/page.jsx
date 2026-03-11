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
              </section>

              <section className={styles.panel}>
                <h2>Character overview</h2>
                <CharacterOverview character={activeCharacter} />
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

          <p className={styles.backLink}>
            <Link href="/">Back to home page</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
