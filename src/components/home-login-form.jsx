"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "@/app/page.module.css";

export default function HomeLoginForm() {
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
      setFeedback({ tone: "error", text: "Login failed. Try again." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className={styles.loginForm} onSubmit={onSubmit}>
      <label className={styles.loginLabel} htmlFor="home-email">
        Email
        <input
          className={styles.loginInput}
          id="home-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className={styles.loginLabel} htmlFor="home-password">
        Password
        <input
          className={styles.loginInput}
          id="home-password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <button className={styles.loginButton} disabled={isLoading} type="submit">
        {isLoading ? "Logging in..." : "Log in"}
      </button>

      {feedback ? (
        <p className={`${styles.loginFeedback} ${styles.loginFeedbackError}`}>
          {feedback.text}
        </p>
      ) : null}
    </form>
  );
}
