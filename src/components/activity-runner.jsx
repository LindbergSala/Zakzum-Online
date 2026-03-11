"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CHARACTER_STAT_LABELS } from "@/lib/stat-effects";

function formatDelta(delta) {
  if (!delta || typeof delta !== "object") {
    return "No delta.";
  }

  return Object.entries(delta)
    .map(([key, value]) => {
      const numericValue = Number(value);
      const sign = numericValue > 0 ? "+" : "";
      return `${key}: ${sign}${numericValue}`;
    })
    .join(", ");
}

function formatStatWithBonus(statKey, stats) {
  const label = CHARACTER_STAT_LABELS[statKey] ?? statKey.toUpperCase();
  if (!stats) {
    return label;
  }

  return `${label} ${stats.base[statKey]} + ${stats.bonus[statKey]} = ${stats.effective[statKey]}`;
}

function formatTotals(resources) {
  if (!resources || typeof resources !== "object") {
    return "No resource data.";
  }

  return [
    `HP ${resources.hp}`,
    `Energy ${resources.energy}`,
    `Gold ${resources.gold}`,
    `XP ${resources.xp}`,
    `Level ${resources.level}`,
    `Renown ${resources.renown}`,
    `Heat ${resources.heat}`,
  ].join(" | ");
}

function formatDeltaBonus(deltaBonus) {
  if (!deltaBonus || typeof deltaBonus !== "object") {
    return "No extra bonus on this action.";
  }

  const parts = Object.entries(deltaBonus)
    .filter(([, value]) => Number(value) !== 0)
    .map(([key, value]) => {
      const numericValue = Number(value);
      const sign = numericValue > 0 ? "+" : "";
      return `${key}: ${sign}${numericValue}`;
    });

  return parts.length > 0
    ? parts.join(", ")
    : "No extra bonus on this action.";
}

export default function ActivityRunner({ activity }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  async function runActivity() {
    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/game/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: activity.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLastResult(null);
        setFeedback({ tone: "error", text: data.message });
        return;
      }

      setLastResult(data.result ?? null);
      setFeedback({ tone: "ok", text: data.message });
      router.refresh();
    } catch {
      setLastResult(null);
      setFeedback({
        tone: "error",
        text: "The activity could not be completed. Try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className={`activity-page-panel activity-theme-${activity.id}`}>
      <p>{activity.pageIntro}</p>
      <p>
        <strong>Risk profile:</strong> {activity.riskProfile}
      </p>
      <p>
        <strong>Energy cost:</strong> {activity.energyCost}
      </p>
      <p>
        <strong>Success reward:</strong>{" "}
        {formatDelta(activity.successReward)}
      </p>
      <p>
        <strong>Fail penalty:</strong>{" "}
        {formatDelta(activity.failPenalty)}
      </p>

      <p>
        <button type="button" onClick={runActivity} disabled={isLoading}>
          {isLoading ? "Running..." : `Start ${activity.name}`}
        </button>
      </p>

      {feedback ? (
        <p className={`feedback ${feedback.tone}`}>{feedback.text}</p>
      ) : null}

      {lastResult ? (
        <div>
          <p>
            <strong>Result:</strong>{" "}
            {lastResult.success ? "SUCCESS" : "FAIL"}
          </p>
          <p>
            <strong>Energy cost:</strong> {lastResult.energyCost}
          </p>
          <p>
            <strong>Roll:</strong> {lastResult.roll.value} + mod{" "}
            {lastResult.roll.statModifier} = {lastResult.roll.total} (target{" "}
            {lastResult.roll.target}, chance {lastResult.roll.chancePercent}%)
          </p>
          <p>
            <strong>Level bonus in roll:</strong> +{lastResult.roll.levelModifier}{" "}
            (level {lastResult.roll.characterLevel}, base mod{" "}
            {lastResult.roll.baseStatModifier})
          </p>
          <p>
            <strong>Stats in roll:</strong>{" "}
            {formatStatWithBonus(lastResult.roll.primaryStat, lastResult.stats)} and{" "}
            {formatStatWithBonus(lastResult.roll.secondaryStat, lastResult.stats)}
          </p>
          <p>
            <strong>Progression:</strong> Level {lastResult.progression.levelAfter} | XP{" "}
            {lastResult.progression.xp.xp} / next level at{" "}
            {lastResult.progression.xp.nextLevelXpTarget}
            {lastResult.progression.leveledUp ? " | LEVEL UP!" : ""}
          </p>
          <p>
            <strong>Class passive:</strong>{" "}
            {lastResult.classIdentity.passive.name} -{" "}
            {lastResult.classIdentity.passive.description}
          </p>
          <p>
            <strong>Passive effect this action:</strong>{" "}
            Roll +{lastResult.classIdentity.passiveRollModifier},{" "}
            {formatDeltaBonus(lastResult.classIdentity.passiveDeltaBonus)}
          </p>
          <p>
            <strong>Reward/Penalty (delta):</strong>{" "}
            {formatDelta(lastResult.delta)}
          </p>
          <p>
            <strong>New totals:</strong>{" "}
            {formatTotals(lastResult.totals?.after)}
          </p>
        </div>
      ) : null}
    </section>
  );
}
