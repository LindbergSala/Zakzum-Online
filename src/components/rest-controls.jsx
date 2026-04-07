"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./rest-controls.module.css";

function formatCountdown(secondsLeft) {
  const safeSeconds = Math.max(0, Number(secondsLeft) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function RestControls({
  restMeta = null,
  currentHeat = 0,
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(restMeta?.secondsUntilNextRecovery ?? 0);

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
      <div className={styles.copyBlock}>
        <p className={styles.kicker}>Heat Rest</p>
        {restMeta?.isResting ? (
          <>
            <p className={styles.title}>Rest in progress</p>
            <p className={styles.body}>
              Rest stays active until you cancel it. While resting, activities, market
              actions, and inventory actions are locked.
            </p>
            <p className={styles.timer}>Next recovery in: {formatCountdown(secondsLeft)}</p>
            <p className={styles.body}>
              Every 15 minutes: -{restMeta.heatRecoveredPerPass} Heat.
            </p>
          </>
        ) : (
          <>
            <p className={styles.title}>Start ongoing rest</p>
            <p className={styles.body}>
              Rest continues until you cancel it. Every 15 minutes, Heat goes down by 4.
              While resting, you cannot do gameplay actions.
            </p>
            <p className={styles.body}>Current Heat: {currentHeat}</p>
          </>
        )}
      </div>

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

      {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
    </section>
  );
}