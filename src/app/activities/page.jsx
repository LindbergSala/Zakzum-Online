import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import ActivityActions from "@/components/activity-actions";
import GameNav from "@/components/game-nav";
import ResourceStrip from "@/components/resource-strip";
import { getActiveCharacterForUser } from "@/lib/character";
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

export default async function ActivitiesPage() {
  const user = await requirePageUser();
  const activeCharacter = await getActiveCharacterForUser(user.id);

  return (
    <div className={`${styles.pageShell} ${bodyFont.className}`}>
      <main className={styles.main}>
        <GameNav />
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>Action Board</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>Activities</h1>
            <p className={styles.lead}>
              Choose an activity group, then progress through its internal tiers.
            </p>
          </header>

          <section className={styles.panel}>
            <h2>Available activity groups</h2>
            <p className={styles.muted}>
              Quest is the lower-risk track, Adventure is the harder next tier, and Arena stays
              duel-focused.
            </p>
            {activeCharacter ? (
              <>
                <div className={styles.metricCard}>
                  <ResourceStrip resources={getCharacterResourceSnapshot(activeCharacter)} />
                </div>
                <div className={styles.actionsWrap}>
                  <ActivityActions />
                </div>
              </>
            ) : (
              <p className={styles.emptyState}>
                You must create a character before you can do activities.{" "}
                <Link href="/character/create">Create character</Link>.
              </p>
            )}
            <p className={styles.backLink}>
              <Link href="/dashboard" aria-label="Back to dashboard">
                &larr;
              </Link>
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
