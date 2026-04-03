import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import { MusicToggleButton } from "@/components/audio/start-page-music";
import HomeLoginForm from "@/components/home-login-form";
import { getLatestUpdateMessage } from "@/lib/latest-update";
import styles from "../page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function HomePage() {
  const latestUpdateMessage = getLatestUpdateMessage();

  return (
    <main className={`${styles.home} ${bodyFont.className}`}>
      <section className={styles.heroCard}>
        <div className={styles.heroIntro}>
          <p className={styles.kicker}>Fantasy Browser RPG Prototype</p>
          <h1 className={`${styles.title} ${headingFont.className}`}>
            Zakzum Online
          </h1>
        </div>
        <MusicToggleButton
          className={`music-toggle-button ${styles.homeMusicButton}`}
        />

        <section className={styles.loginPanel}>
          <h2 className={styles.loginHeading}>Already have an account?</h2>
          <p className={styles.loginText}>
            Sign in directly from the home screen.
          </p>
          <HomeLoginForm />
        </section>

        <div className={styles.actions}>
          <Link className={styles.primaryAction} href="/register">
            Create account
          </Link>
        </div>

        <div className={styles.featureGrid}>
          <article className={styles.featureItem}>
            <h2>Create you own hero</h2>
            <p>Level up, complete quests and adventures.</p>
          </article>
          <article className={styles.featureItem}>
            <h2>Text based RPG</h2>
            <p>Bring your character to life and explore the secrets of Zakzum.</p>
          </article>
          <article className={styles.featureItem}>
            <h2>Latest update</h2>
            <p>{latestUpdateMessage}</p>
          </article>
        </div>
      </section>
    </main>
  );
}
