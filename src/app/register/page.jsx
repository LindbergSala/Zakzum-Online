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

      setFeedback({ tone: "ok", text: "Konto skapat. Du kan nu logga in." });
      setPassword("");
    } catch {
      setFeedback({
        tone: "error",
        text: "Registreringen misslyckades. Forsok igen.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      <h1>Skapa konto</h1>
      <p>Anvand e-post och losenord for att skapa en ny anvandare.</p>

      <form onSubmit={onSubmit}>
        <label htmlFor="email">
          E-post
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
          Losenord
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
          {isLoading ? "Skapar konto..." : "Registrera"}
        </button>
      </form>

      {feedback ? (
        <p className={`feedback ${feedback.tone}`}>{feedback.text}</p>
      ) : null}

      <p>
        Har du redan konto? <Link href="/login">Logga in har</Link>.
      </p>
    </main>
  );
}
