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

function formatReadableOutcomeDelta(delta) {
  if (!delta || typeof delta !== "object") {
    return "No resource changes.";
  }

  const parts = Object.entries(delta)
    .filter(([, value]) => Number(value) !== 0)
    .map(([key, value]) => {
      const numericValue = Number(value);
      const sign = numericValue > 0 ? "+" : "";
      return `${key.toUpperCase()} ${sign}${numericValue}`;
    });

  return parts.length > 0 ? parts.join(" | ") : "No resource changes.";
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

function formatLoot(loot) {
  if (!loot) {
    return "No loot dropped.";
  }

  const rarityLabel = loot.rarity ? `, ${loot.rarity}` : "";
  return `${loot.name} x${loot.quantity} (${loot.category}${rarityLabel})`;
}

function getLootToastClass(loot) {
  if (!loot) {
    return "loot-toast-empty";
  }

  const rarity = typeof loot.rarity === "string" ? loot.rarity.toLowerCase() : "common";
  return `loot-toast-drop loot-toast-rarity-${rarity}`;
}

function getLootHeadline(loot) {
  if (!loot) {
    return "No item dropped this run.";
  }

  const quantity = Number(loot.quantity) || 1;
  const quantityLabel = quantity > 1 ? ` x${quantity}` : "";
  return `${loot.name}${quantityLabel}`;
}

function getNextStepHint(lastResult) {
  if (!lastResult) {
    return "";
  }

  if (!lastResult.success) {
    return "Try one more low-risk Quest run to stabilize momentum, then reassess HP and Energy.";
  }

  if (lastResult.loot) {
    return "Open Inventory to review your drop, then run another activity to chain rewards.";
  }

  return "Run another activity to build momentum toward your next level and market purchase.";
}

function formatActivityContext(activityContext) {
  if (!activityContext || typeof activityContext !== "object") {
    return "";
  }

  const locationName = activityContext.locationName ?? "";
  const regionName = activityContext.regionName ?? "";

  if (locationName && regionName) {
    return `${locationName}, ${regionName}`;
  }

  if (locationName) {
    return locationName;
  }

  return regionName;
}

export default function ActivityRunner({ activity }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  async function runActivity() {
    setIsLoading(true);
    setFeedback(null);
    setLastResult(null);

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
    <section className={`activity-page-panel activity-theme-${activity.groupId ?? activity.id}`}>
      {typeof activity.tier === "number" ? (
        <p>
          <strong>Tier:</strong> {activity.tier}
        </p>
      ) : null}
      {activity.locationName ? (
        <p>
          <strong>Location:</strong> {activity.locationName}
          {activity.regionName ? ` (${activity.regionName})` : ""}
        </p>
      ) : null}
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

      {isLoading ? (
        <p className="feedback loading" aria-live="polite">
          Resolving action...
        </p>
      ) : null}

      {feedback ? (
        feedback.tone === "error" ? (
          <section className="action-result-card action-result-error" aria-live="polite">
            <p>{feedback.text}</p>
          </section>
        ) : (
          <p className={`feedback ${feedback.tone}`} aria-live="polite">
            {feedback.text}
          </p>
        )
      ) : null}

      {lastResult ? (
        <section
          className={`action-result-card ${
            lastResult.success ? "action-result-ok" : "action-result-error"
          }`}
          aria-live="polite"
        >
          <div className="activity-outcome-summary">
            <p className="activity-outcome-line">
              <strong>Action:</strong> {activity.name}
            </p>
            {formatActivityContext(lastResult.activityContext) ? (
              <p className="activity-outcome-line">
                <strong>Location:</strong> {formatActivityContext(lastResult.activityContext)}
              </p>
            ) : null}
            <p className="activity-outcome-line">
              <strong>Outcome:</strong>{" "}
              {lastResult.success ? "Success" : "Failure"}
            </p>
            <p className="activity-outcome-line">
              <strong>Why:</strong> Roll {lastResult.roll.total} vs target{" "}
              {lastResult.roll.target}.
            </p>
            <p className="activity-outcome-line">
              <strong>Reward/Penalty:</strong>{" "}
              {formatReadableOutcomeDelta(lastResult.delta)}
            </p>
            <p className="activity-outcome-line">
              <strong>Next step:</strong> {getNextStepHint(lastResult)}
            </p>
          </div>

          <div className={`loot-toast ${getLootToastClass(lastResult.loot)}`}>
            <p className="loot-toast-kicker">{lastResult.loot ? "Loot Drop" : "Loot"}</p>
            <p className="loot-toast-headline">{getLootHeadline(lastResult.loot)}</p>
            {lastResult.loot ? (
              <p className="loot-toast-meta">
                {lastResult.loot.category} | {lastResult.loot.rarity} |{" "}
                {lastResult.loot.stackable ? "stackable" : "unique slot item"}
              </p>
            ) : null}
          </div>

          <p>
            <strong>Progression:</strong> Level {lastResult.progression.levelAfter} | XP{" "}
            {lastResult.progression.xp.xp} / next level at{" "}
            {lastResult.progression.xp.nextLevelXpTarget}
            {lastResult.progression.leveledUp ? " | LEVEL UP!" : ""}
          </p>
          <p>
            <strong>Resources now:</strong>{" "}
            {formatTotals(lastResult.totals?.after)}
          </p>
          <details className="action-result-details">
            <summary className="action-result-details-summary">
              Show technical breakdown
            </summary>
            <div className="action-result-details-body">
              <p>
                <strong>Result:</strong>{" "}
                {lastResult.success ? "SUCCESS" : "FAIL"}
              </p>
              <p>
                <strong>Energy cost:</strong> {lastResult.energyCost}
              </p>
              <p>
                <strong>Roll:</strong> {lastResult.roll.value} + bonus{" "}
                {lastResult.roll.totalRollBonus ?? lastResult.roll.statModifier} ={" "}
                {lastResult.roll.total} (target{" "}
                {lastResult.roll.target}, chance {lastResult.roll.chancePercent}%)
              </p>
              {typeof lastResult.roll.baseTarget === "number" ? (
                <p>
                  <strong>Target breakdown:</strong> Base {lastResult.roll.baseTarget} + Level scaling{" "}
                  {lastResult.roll.difficultyLevelScaling ?? 0}
                </p>
              ) : null}
              <p>
                <strong>Bonus breakdown:</strong> Primary x2{" "}
                {lastResult.roll.primaryContribution ?? "-"} + Secondary{" "}
                {lastResult.roll.secondaryContribution ?? "-"} + Level{" "}
                {lastResult.roll.levelContribution ?? lastResult.roll.levelModifier} + Passive{" "}
                {lastResult.roll.passiveRollModifier}
                {typeof lastResult.roll.itemRollModifier === "number"
                  ? ` + Item ${lastResult.roll.itemRollModifier}`
                  : ""}
                {typeof lastResult.roll.totalPassiveRollModifier === "number"
                  ? ` (total ${lastResult.roll.totalPassiveRollModifier})`
                  : ""}
              </p>
              <p>
                <strong>Stats in roll:</strong>{" "}
                {formatStatWithBonus(lastResult.roll.primaryStat, lastResult.stats)} and{" "}
                {formatStatWithBonus(lastResult.roll.secondaryStat, lastResult.stats)}
              </p>
              <p>
                <strong>Class passive:</strong>{" "}
                {lastResult.classIdentity.passive.name} -{" "}
                {lastResult.classIdentity.passive.description}
              </p>
              <p>
                <strong>Class effect this action:</strong>{" "}
                Roll +{lastResult.classIdentity.passiveRollModifier},{" "}
                Energy cost reduction{" "}
                {lastResult.classIdentity.passiveEnergyCostReduction ?? 0},{" "}
                {formatDeltaBonus(lastResult.classIdentity.passiveDeltaBonus)}
              </p>
              {lastResult.raceIdentity ? (
                <>
                  <p>
                    <strong>Racial passive:</strong>{" "}
                    {lastResult.raceIdentity.passive.name} -{" "}
                    {lastResult.raceIdentity.passive.description}
                  </p>
                  <p>
                    <strong>Racial effect this action:</strong>{" "}
                    Roll +{lastResult.raceIdentity.passiveRollModifier ?? 0},{" "}
                    {formatDeltaBonus(lastResult.raceIdentity.passiveDeltaBonus)}
                    {lastResult.raceIdentity.halfOrcRelentlessTriggered
                      ? " | Relentless triggered (survived at 1 HP)."
                      : ""}
                  </p>
                </>
              ) : null}
              {lastResult.itemIdentity ? (
                <p>
                  <strong>Item effect this action:</strong>{" "}
                  Roll +{lastResult.itemIdentity.passiveRollModifier ?? 0},{" "}
                  {formatDeltaBonus(lastResult.itemIdentity.passiveDeltaBonus)}
                </p>
              ) : null}
              <p>
                <strong>Reward/Penalty (delta):</strong>{" "}
                {formatDelta(lastResult.delta)}
              </p>
              <p>
                <strong>Loot:</strong> {formatLoot(lastResult.loot)}
              </p>
            </div>
          </details>
        </section>
      ) : null}
    </section>
  );
}
