"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./delete-character-form.module.css";

export default function DeleteCharacterForm() {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  function openForm() {
    setFeedback(null);
    setIsExpanded(true);
  }

  function closeForm() {
    if (isLoading) {
      return;
    }

    setPassword("");
    setFeedback(null);
    setIsExpanded(false);
  }

  async function handleDelete(event) {
    event.preventDefault();

    if (!password || isLoading) {
      return;
    }

    const confirmed = window.confirm(
      "Delete character permanently? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/character", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setFeedback({
          tone: "error",
          text: data.message ?? "Character could not be deleted.",
        });
        return;
      }

      setFeedback({
        tone: "ok",
        text: data.message ?? "Character deleted.",
      });
      setPassword("");
      router.refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: "Character could not be deleted.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Danger zone</h3>
      <p className={styles.text}>
        Delete this character permanently. Account remains, but character, inventory,
        and logs are removed.
      </p>

      {!isExpanded ? (
        <div className={styles.actions}>
          <button
            className={styles.dangerButton}
            onClick={openForm}
            type="button"
          >
            Delete character
          </button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleDelete}>
          <label className={styles.label} htmlFor="delete-character-password">
            Confirm account password
          </label>
          <input
            id="delete-character-password"
            className={styles.input}
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <div className={styles.actions}>
            <button
              className={styles.dangerButton}
              disabled={isLoading || password.length < 8}
              type="submit"
            >
              {isLoading ? "Deleting..." : "Confirm delete"}
            </button>
            <button
              className={styles.secondaryButton}
              onClick={closeForm}
              type="button"
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {feedback ? (
        <p
          className={`${styles.feedback} ${
            feedback.tone === "error" ? styles.feedbackError : styles.feedbackOk
          }`}
        >
          {feedback.text}
        </p>
      ) : null}
    </section>
  );
}
