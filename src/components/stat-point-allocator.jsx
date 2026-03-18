"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CHARACTER_STAT_FIELDS } from "@/lib/character-data";
import styles from "./stat-point-allocator.module.css";

export default function StatPointAllocator({ character }) {
  const router = useRouter();
  const [loadingStatKey, setLoadingStatKey] = useState("");
  const [feedback, setFeedback] = useState(null);
  const unspentPoints = Number(character?.unspentStatPoints) || 0;

  async function assignPoint(statKey) {
    if (unspentPoints <= 0 || loadingStatKey) {
      return;
    }

    setLoadingStatKey(statKey);
    setFeedback(null);

    try {
      const response = await fetch("/api/character", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statKey }),
      });
      const data = await response.json();

      if (!response.ok) {
        setFeedback({
          tone: "error",
          text: data.message ?? "Could not assign stat point.",
        });
        return;
      }

      setFeedback({
        tone: "ok",
        text: data.message ?? "Stat increased.",
      });
      router.refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: "Could not assign stat point.",
      });
    } finally {
      setLoadingStatKey("");
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h3>Level-up stat points</h3>
        <p>{unspentPoints} unspent</p>
      </div>
      <p className={styles.description}>
        Spend 1 point to increase any stat by +1.
      </p>
      <ul className={styles.grid}>
        {CHARACTER_STAT_FIELDS.map((field) => (
          <li className={styles.statRow} key={field.key}>
            <p className={styles.statValue}>
              <strong>{field.label}</strong>: {character[field.key]}
            </p>
            <button
              className={styles.action}
              disabled={unspentPoints <= 0 || Boolean(loadingStatKey)}
              onClick={() => assignPoint(field.key)}
              type="button"
            >
              {loadingStatKey === field.key ? "Applying..." : `+1 ${field.label}`}
            </button>
          </li>
        ))}
      </ul>
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
