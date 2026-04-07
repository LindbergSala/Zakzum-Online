"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./rest-controls.module.css";

const HEAT_THRESHOLDS = [20, 40, 60, 80];

function formatCountdown(secondsLeft) {
  const safeSeconds = Math.max(0, Number(secondsLeft) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatHeatValue(value) {
  const numericValue = Number(value) || 0;
  return numericValue > 0 ? `+${numericValue}` : `${numericValue}`;
}

function getHeatPenalty(heat) {
  return -HEAT_THRESHOLDS.filter((threshold) => heat >= threshold).length;
}

function getNextHeatThreshold(heat) {
  return HEAT_THRESHOLDS.find((threshold) => heat < threshold) ?? null;
}

export default function RestControls({
  restMeta = null,
  currentHeat = 0,
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(restMeta?.secondsUntilNextRecovery ?? 0);
  const currentPenalty = getHeatPenalty(currentHeat);
  const nextThreshold = getNextHeatThreshold(currentHeat);
  const heatSummary = currentPenalty === 0
    ? `No roll penalty yet. The first penalty starts at ${nextThreshold ?? 20} Heat.`
    : nextThreshold
      ? `Current roll penalty: ${formatHeatValue(currentPenalty)}. The next penalty starts at ${nextThreshold} Heat.`
      : `Current roll penalty: ${formatHeatValue(currentPenalty)}. This is the maximum Heat penalty.`;

  useEffect(() => {
    setSecondsLeft(restMeta?.secondsUntilNextRecovery ?? 0);
  }, [restMeta?.secondsUntilNextRecovery]);

  useEffect(() => {
    if (!restMeta?.isResting) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setSecondsLeft((previousSeconds) => Math.max(0, previousSeconds - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [restMeta?.isResting]);

  useEffect(() => {
    if (!restMeta?.isResting || secondsLeft > 0) {
      return;
    }

    router.refresh();
  }, [restMeta?.isResting, secondsLeft, router]);

  async function submitRestAction(action) {
    setIsSubmitting(true);
    setFeedback("");

    try {
      const response = await fetch("/api/game/rest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setFeedback(data.message ?? "Rest action failed.");
        return;
      }

      setFeedback(data.message ?? "Rest updated.");
      router.refresh();
    } catch {
      setFeedback("Rest action failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div className={styles.copyBlock}>
          <p className={styles.title}>Heat Rest</p>
          <p className={styles.body}>{heatSummary}</p>
        </div>

        <div className={styles.statusPill}>
          {restMeta?.isResting ? "Resting" : "Ready"}
        </div>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Current Heat</span>
          <span className={styles.summaryValue}>{currentHeat}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Roll Penalty</span>
          <span className={styles.summaryValue}>{formatHeatValue(currentPenalty)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Recovery</span>
          <span className={styles.summaryValueMuted}>{formatHeatValue(-4)} every 15 min</span>
        </div>
      </div>

      {restMeta?.isResting ? (
        <div className={styles.restState}>
          <p className={styles.timerLabel}>Next recovery</p>
          <p className={styles.timer}>{formatCountdown(secondsLeft)}</p>
          <p className={styles.body}>Actions stay locked while you rest. Cancel any time.</p>
        </div>
      ) : (
        <div className={styles.restState}>
          <p className={styles.timerLabel}>When to use it</p>
          <p className={styles.body}>Use Rest to lower Heat before the next penalty tier hits.</p>
        </div>
      )}

      <div className={styles.actions}>
        {restMeta?.isResting ? (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => submitRestAction("cancel")}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Canceling..." : "Cancel Rest"}
          </button>
        ) : (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => submitRestAction("start")}
            disabled={isSubmitting || currentHeat <= 0}
          >
            {isSubmitting ? "Starting..." : "Start Rest"}
          </button>
        )}
      </div>

      {feedback ? (
        <p className={styles.feedback} role="status">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}