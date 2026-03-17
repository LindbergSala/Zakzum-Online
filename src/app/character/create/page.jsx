import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import CharacterCreateForm from "@/components/character-create-form";
import GameNav from "@/components/game-nav";
import {
  getCharacterClassLabel,
  getCharacterRaceLabel,
} from "@/lib/character-data";
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

export default async function CharacterCreatePage() {
  const user = await requirePageUser();
  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);
  const existingCharacter = userWithCharacter?.activeCharacter ?? null;

  if (existingCharacter) {
    return (
      <div className={`${styles.pageShell} ${bodyFont.className}`}>
        <main className={styles.main}>
          <GameNav />
          <section className={styles.heroCard}>
            <header className={styles.heroIntro}>
              <p className={styles.kicker}>Hero Profile</p>
              <h1 className={`${styles.title} ${headingFont.className}`}>Character</h1>
              <p className={styles.lead}>
                You already have a character on this account.
              </p>
            </header>

            <section className={styles.panel}>
              <p>
                Name: <strong>{existingCharacter.name}</strong> | Class:{" "}
                <strong>{getCharacterClassLabel(existingCharacter.characterClass)}</strong>{" "}
                | Race:{" "}
                <strong>{getCharacterRaceLabel(existingCharacter.characterRace)}</strong>{" "}
                | Level: <strong>{existingCharacter.level}</strong>
              </p>
              <p className={styles.backLink}>
                <Link href="/dashboard">Back to dashboard</Link>
              </p>
              <p className={styles.backLink}>
                <Link href="/character">Back to character overview</Link>
              </p>
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
            <p className={styles.kicker}>Hero Forge</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>
              Create Character
            </h1>
            <p className={styles.lead}>
              Class selection and base stats come from your character base.
            </p>
          </header>

          <section className={styles.panel}>
            <p>
              Point-buy rules: each stat 8-15, total budget 27 points.
            </p>
            <p>
              Class start bonus is applied after point-buy validation.
            </p>
            <CharacterCreateForm />
            <p className={styles.backLink}>
              <Link href="/dashboard">Back to dashboard</Link>
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
