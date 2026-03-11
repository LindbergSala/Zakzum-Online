"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <main>
      <h1>Log in</h1>
      <p>Use your email and password to continue.</p>

      <form onSubmit={onSubmit}>
        <label htmlFor="email">
          Email
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label htmlFor="password">
          Password
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <button disabled={isLoading} type="submit">
          {isLoading ? "Logging in..." : "Log in"}
        </button>
      </form>

      {feedback ? (
        <p className={`feedback ${feedback.tone}`}>{feedback.text}</p>
      ) : null}

      <p>
        Do not have an account? <Link href="/register">Create one here</Link>.
      </p>
    </main>
  );
}
