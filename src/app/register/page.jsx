"use client";

import Link from "next/link";
import { useState } from "react";

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
    <main>
      <h1>Create account</h1>
      <p>Use email and password to create a new user.</p>

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
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <button disabled={isLoading} type="submit">
          {isLoading ? "Creating account..." : "Register"}
        </button>
      </form>

      {feedback ? (
        <p className={`feedback ${feedback.tone}`}>{feedback.text}</p>
      ) : null}

      <p>
        Already have an account? <Link href="/login">Log in here</Link>.
      </p>
    </main>
  );
}
