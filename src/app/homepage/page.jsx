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
          <p className={styles.lead}>
            Shape your character, chase progression, and keep your journey saved
            between sessions.
          </p>
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
            <h2>Persistent Hero</h2>
            <p>Your active character is loaded as soon as you sign in.</p>
          </article>
          <article className={styles.featureItem}>
            <h2>Fast Progression Loop</h2>
            <p>Activities, resources, and level growth keep momentum high.</p>
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
