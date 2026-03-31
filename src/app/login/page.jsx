"use client";

import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function onSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({ tone: "error", text: data.message });
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: "Login failed. Try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={`${styles.pageShell} ${bodyFont.className}`}>
      <main className={styles.main}>
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>Guild Access</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>Log in</h1>
            <p className={styles.lead}>Use your email and password to continue.</p>
          </header>

          <section className={styles.panel}>
            <form className={styles.form} onSubmit={onSubmit}>
              <label className={styles.label} htmlFor="email">
                <span>Email</span>
                <input
                  className={styles.input}
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className={styles.label} htmlFor="password">
                <span>Password</span>
                <input
                  className={styles.input}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <button className={styles.submitButton} disabled={isLoading} type="submit">
                {isLoading ? "Logging in..." : "Log in"}
              </button>
            </form>

            {feedback ? (
              <p
                aria-live="polite"
                className={`${styles.feedback} ${
                  feedback.tone === "error" ? styles.feedbackError : styles.feedbackOk
                }`}
              >
                {feedback.text}
              </p>
            ) : null}

            <p className={styles.switchPrompt}>
              Do not have an account?{" "}
              <Link className={styles.switchLink} href="/register">
                Create one here
              </Link>
              .
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
