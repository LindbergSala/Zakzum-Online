import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import CharacterOverview from "@/components/character-overview";
import GameNav from "@/components/game-nav";
import { getUserWithResolvedActiveCharacter } from "@/lib/character";
import { requirePageUser } from "@/lib/page-auth";
import styles from "./page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default async function CharacterPage() {
  const user = await requirePageUser();
  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);
  const character = userWithCharacter?.activeCharacter ?? null;

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

          <section className={styles.panel}>
            <CharacterOverview character={character} />
            <p className={styles.backLink}>
              <Link href="/dashboard">Back to dashboard</Link>
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
