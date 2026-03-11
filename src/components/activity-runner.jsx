"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CHARACTER_STAT_LABELS } from "@/lib/stat-effects";

function formatDelta(delta) {
  if (!delta || typeof delta !== "object") {
    return "Ingen delta.";
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
    return "Ingen resursdata.";
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
        text: "Aktiviteten kunde inte genomforas. Forsok igen.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className={`activity-page-panel activity-theme-${activity.id}`}>
      <p>{activity.pageIntro}</p>
      <p>
        <strong>Riskprofil:</strong> {activity.riskProfile}
      </p>
      <p>
        <strong>Energy-kostnad:</strong> {activity.energyCost}
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
          {isLoading ? "Korer..." : `Starta ${activity.name}`}
        </button>
      </p>

      {feedback ? (
        <p className={`feedback ${feedback.tone}`}>{feedback.text}</p>
      ) : null}

      {lastResult ? (
        <div>
          <p>
            <strong>Resultat:</strong>{" "}
            {lastResult.success ? "SUCCESS" : "FAIL"}
          </p>
          <p>
            <strong>Energy-kostnad:</strong> {lastResult.energyCost}
          </p>
          <p>
            <strong>Roll:</strong> {lastResult.roll.value} + mod{" "}
            {lastResult.roll.statModifier} = {lastResult.roll.total} (target{" "}
            {lastResult.roll.target}, chans {lastResult.roll.chancePercent}%)
          </p>
          <p>
            <strong>Level-bonus i roll:</strong> +{lastResult.roll.levelModifier}{" "}
            (level {lastResult.roll.characterLevel}, basmod{" "}
            {lastResult.roll.baseStatModifier})
          </p>
          <p>
            <strong>Stats i roll:</strong>{" "}
            {formatStatWithBonus(lastResult.roll.primaryStat, lastResult.stats)} och{" "}
            {formatStatWithBonus(lastResult.roll.secondaryStat, lastResult.stats)}
          </p>
          <p>
            <strong>Progression:</strong> Level {lastResult.progression.levelAfter} | XP{" "}
            {lastResult.progression.xp.xp} / nasta level vid{" "}
            {lastResult.progression.xp.nextLevelXpTarget}
            {lastResult.progression.leveledUp ? " | LEVEL UP!" : ""}
          </p>
          <p>
            <strong>Reward/Penalty (delta):</strong>{" "}
            {formatDelta(lastResult.delta)}
          </p>
          <p>
            <strong>Nya totalsummor:</strong>{" "}
            {formatTotals(lastResult.totals?.after)}
          </p>
        </div>
      ) : null}
    </section>
  );
}
