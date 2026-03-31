import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import CharacterCreateForm from "@/components/character-create-form";
import GameNav from "@/components/game-nav";
import {
  getCharacterBackgroundLabel,
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
                | Background:{" "}
                <strong>
                  {getCharacterBackgroundLabel(existingCharacter.characterBackground)}
                </strong>{" "}
                | Level: <strong>{existingCharacter.level}</strong>
              </p>
              <p className={styles.backLink}>
                <Link href="/dashboard" aria-label="Back to dashboard">
                  &larr;
                </Link>
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
              Class, race, and background shape your hero identity.
            </p>
          </header>

          <section className={styles.panel}>
            <p>
              Every new character starts with base stats at 1.
            </p>
            <p>
              Each level-up grants +1 unspent stat point that you can assign on
              your character page.
            </p>
            <CharacterCreateForm />
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
