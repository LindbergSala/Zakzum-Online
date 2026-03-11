import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import HomeLoginForm from "@/components/home-login-form";
import styles from "./page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function HomePage() {
  return (
    <main className={`${styles.home} ${bodyFont.className}`}>
      <section className={styles.heroCard}>
        <p className={styles.kicker}>Fantasy Browser RPG Prototype</p>
        <h1 className={`${styles.title} ${headingFont.className}`}>
          Zakzum Online
        </h1>
        <p className={styles.lead}>
          Shape your character, chase progression, and keep your journey saved
          between sessions.
        </p>

        <div className={styles.actions}>
          <Link className={styles.primaryAction} href="/register">
            Create account
          </Link>
        </div>

        <section className={styles.loginPanel}>
          <h2 className={styles.loginHeading}>Already have an account?</h2>
          <p className={styles.loginText}>
            Sign in directly from the home screen.
          </p>
          <HomeLoginForm />
        </section>

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
            <h2>Simple Start</h2>
            <p>Register, log in, and jump right into the dashboard in seconds.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
