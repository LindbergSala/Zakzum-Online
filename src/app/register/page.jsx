"use client";

import Link from "next/link";
import { Cinzel, Source_Sans_3 } from "next/font/google";
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

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function onSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({ tone: "error", text: data.message });
        return;
      }

      setFeedback({ tone: "ok", text: "Account created. You can now log in." });
      setPassword("");
    } catch {
      setFeedback({
        tone: "error",
        text: "Registration failed. Try again.",
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
            <p className={styles.kicker}>New Adventurer</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>Create account</h1>
            <p className={styles.lead}>Use email and password to create a new user.</p>
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
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <button className={styles.submitButton} disabled={isLoading} type="submit">
                {isLoading ? "Creating account..." : "Register"}
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
              Already have an account?{" "}
              <Link className={styles.switchLink} href="/login">
                Log in here
              </Link>
              .
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
