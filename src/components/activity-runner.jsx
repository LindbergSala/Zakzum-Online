"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import ActivityRunnerPockets from "./activity-runner-pockets";
import { syncInventoryAction } from "./inventory/inventory-utils";
import { useActivityPocketInventory } from "./use-activity-pocket-inventory";
import { useActivityRollReveal } from "./use-activity-roll-reveal";
import {
  formatActivityDelta,
  formatDeltaBonus,
  formatLoot,
  formatReadableOutcomeDelta,
  formatStatWithBonus,
  getRollDisplayValue,
} from "@/lib/activity-runner-format";
import { postJson } from "@/lib/client-json";

export default function ActivityRunner({
  activity,
  characterId,
  currentHp = 0,
  currentStamina = 0,
  requiredStamina = 0,
  currentHeat = 0,
  currentHeatRollModifier = 0,
  nextHeatThreshold = null,
  expectedHeatBuildUp = null,
  storyStatus = null,
  baseStaminaCost = null,
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPocketActionLoading, setIsPocketActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [availableStamina, setAvailableStamina] = useState(currentStamina);
  const [trayMessage, setTrayMessage] = useState(null);
  const [storyState, setStoryState] = useState(storyStatus);
  const [storyOverlay, setStoryOverlay] = useState(null);
  const { rollReveal, beginRollSequence, revealResolvedRoll, resetRollReveal } =
    useActivityRollReveal();
  const {
    inventoryLoadError,
    isInventoryLoading,
    pocketSlots,
    replaceInventoryItems,
  } = useActivityPocketInventory(characterId);

  useEffect(() => {
    setAvailableStamina(currentStamina);
  }, [currentStamina]);

  useEffect(() => {
    if (currentStamina >= requiredStamina) {
      setTrayMessage(null);
    }
  }, [currentStamina, requiredStamina]);

  useEffect(() => {
    setStoryState(storyStatus);
  }, [storyStatus]);

  const rollDisplayValue = getRollDisplayValue(rollReveal);
  const isBusy = isLoading || isPocketActionLoading;
  const trayVerdict = trayMessage
    ? trayMessage
    : rollReveal?.showOutcome
      ? rollReveal.success
        ? "SUCCESS"
        : "FAIL"
      : null;
  const rollVerdictText = trayVerdict ?? "\u00A0";
  const isLongTrayVerdict = trayVerdict === "Not enough Stamina";
  const outcomeLabel = lastResult?.success ? "Reward" : "Penalty";
  const outcomeDeltaText = lastResult
    ? formatReadableOutcomeDelta(lastResult.delta, {
        includePositive: true,
        includeNegative: !lastResult.success,
      })
    : "No resource changes.";
  const isOutcomeRevealPending = Boolean(lastResult && rollReveal && !rollReveal.showOutcome);
  const shouldShowPendingSummary = isLoading || isOutcomeRevealPending;
  const shouldShowOutcomeSummary = Boolean(lastResult) && (!rollReveal || rollReveal.showOutcome);
  const readyPocketCount = pocketSlots.filter((slot) => slot.item).length;
  const staminaDeficit = Math.max(0, requiredStamina - availableStamina);
  const failureHpCost = Math.abs(Number(activity.failPenalty?.hp) || 0);
  const wouldDropHpToZero = failureHpCost > 0 && currentHp > 0
    ? currentHp - failureHpCost <= 0
    : false;
  const runDecision = (() => {
    if (availableStamina < requiredStamina) {
      return {
        tone: "warn",
        title: "Blocked by stamina",
        summary:
          readyPocketCount > 0
            ? `You need ${staminaDeficit} more Stamina. Use a Quick Slot consumable or wait for recovery.`
            : `You need ${staminaDeficit} more Stamina before this run can start.`,
        note:
          readyPocketCount > 0
            ? `${readyPocketCount} Quick Slot${readyPocketCount === 1 ? "" : "s"} ready.`
            : "No Quick Slot consumables are ready right now.",
      };
    }

    if (currentHeat >= 60 || wouldDropHpToZero) {
      return {
        tone: "danger",
        title: "High-risk attempt",
        summary: wouldDropHpToZero
          ? "A bad outcome can drop this run into lethal territory."
          : "Heat pressure is already severe, so this run starts from a weak roll position.",
        note: expectedHeatBuildUp
          ? `Expected Heat: +${expectedHeatBuildUp.success} on success, +${expectedHeatBuildUp.failure} on failure.`
          : "Pressure is high even before extra effects are counted.",
      };
    }

    if (currentHeat >= 20 || (expectedHeatBuildUp?.failure ?? 0) >= 8) {
      return {
        tone: "warn",
        title: "Manageable, but costly if it goes wrong",
        summary: "You can run this now, but a failure will push pressure and recovery needs upward.",
        note: nextHeatThreshold
          ? `Next Heat breakpoint at ${nextHeatThreshold.minimumHeat}.`
          : "You are already at the last Heat breakpoint.",
      };
    }

    return {
      tone: "ok",
      title: "Good window to run",
      summary: "Resources are stable enough for a productive attempt.",
      note: readyPocketCount > 0
        ? `${readyPocketCount} Quick Slot${readyPocketCount === 1 ? "" : "s"} available for prep.`
        : "No extra consumable prep is active.",
    };
  })();

  async function handleUsePocket(slotIndex) {
    const pocketItem = pocketSlots.find((slot) => slot.slotIndex === slotIndex)?.item;

    if (!pocketItem || isBusy) {
      return;
    }

    try {
      setIsPocketActionLoading(true);
      const data = await syncInventoryAction({
        action: "use",
        itemRecordId: pocketItem.id,
        quantity: 1,
      });

      const nextStamina = Number(data.resources?.stamina);
      replaceInventoryItems(data.items ?? []);
      setAvailableStamina((current) =>
        Number.isFinite(nextStamina) ? nextStamina : current,
      );
      setTrayMessage(null);
      setFeedback({
        tone: "ok",
        text: data.message ?? `${pocketItem.itemName} used.`,
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error.message ?? "Could not use consumable.",
      });
    } finally {
      setIsPocketActionLoading(false);
    }
  }

  async function runActivity() {
    if (availableStamina < requiredStamina) {
      resetRollReveal();
      setLastResult(null);
      setFeedback(null);
      setTrayMessage("Not enough Stamina");
      return;
    }

    const startedAt = Date.now();
    const sequenceId = beginRollSequence();

    setIsLoading(true);
    setFeedback(null);
    setLastResult(null);
    setTrayMessage(null);
    setStoryOverlay(null);

    try {
      const { ok, data } = await postJson("/api/game/activities", {
        activityId: activity.id,
      });

      if (!ok) {
        setLastResult(null);
        resetRollReveal();
        if (typeof data.message === "string" && data.message.startsWith("Not enough Stamina")) {
          setTrayMessage("Not enough Stamina");
          setFeedback(null);
          return;
        }
        setFeedback({ tone: "error", text: data.message });
        return;
      }

      setLastResult(data.result ?? null);
      if (data.result?.storyProgress) {
        setStoryState(data.result.storyProgress);
        setStoryOverlay(data.result.storyProgress.overlay ?? null);
      }
      setAvailableStamina(data.result?.totals?.after?.stamina ?? availableStamina);
      if (data.result) {
        revealResolvedRoll(data.result, sequenceId, startedAt);
      } else {
        resetRollReveal();
      }
      setFeedback({ tone: "ok", text: data.message });
      router.refresh();
    } catch {
      setLastResult(null);
      resetRollReveal();
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
      <section className="activity-briefing">
        <p className="activity-briefing-kicker">Current Contract</p>
        <h2 className="activity-runner-title">{activity.name}</h2>
        <p className="activity-briefing-copy">{activity.pageIntro}</p>
        <p className="activity-briefing-copy">
          Heat lowers your roll bonus at 20, 40, 60 and 80 Heat. You are currently at Heat {currentHeat},
          so this action starts with {currentHeatRollModifier >= 0 ? "+0" : currentHeatRollModifier} from Heat.
          {nextHeatThreshold
            ? ` Next threshold: ${nextHeatThreshold.minimumHeat} Heat for ${nextHeatThreshold.rollModifier}.`
            : " Maximum Heat penalty already active."}
        </p>
        {expectedHeatBuildUp ? (
          <p className="activity-briefing-copy">
            Expected Heat from this action: +{expectedHeatBuildUp.success} on success, +{expectedHeatBuildUp.failure} on failure.
          </p>
        ) : null}
        {activity.groupId === "story" ? (
          <p className="activity-briefing-copy">
            Story rule: clear {storyState?.requiredSuccesses ?? 3} successful rolls in a row to finish this chapter.
            Current chapter progress is {storyState?.currentStreak ?? 0}/{storyState?.requiredSuccesses ?? 3},
            and any failed roll resets the chapter back to 0/{storyState?.requiredSuccesses ?? 3}.
            Starting a fresh chapter from 0/{storyState?.requiredSuccesses ?? 3} always costs 20 Stamina.
            Your current attempt cost is {baseStaminaCost ?? requiredStamina} before any class adjustment.
          </p>
        ) : null}
        <div className="activity-briefing-stakes">
          <p className="activity-briefing-stake activity-briefing-stake-success">
            <span className="activity-briefing-stake-label">Success reward</span>
            <span className="activity-briefing-stake-value">{formatActivityDelta(activity.successReward)}</span>
          </p>
          <p className="activity-briefing-stake activity-briefing-stake-fail">
            <span className="activity-briefing-stake-label">Fail penalty</span>
            <span className="activity-briefing-stake-value">{formatActivityDelta(activity.failPenalty)}</span>
          </p>
        </div>
      </section>

      <ActivityRunnerPockets
        pocketSlots={pocketSlots}
        isBusy={isBusy}
        isInventoryLoading={isInventoryLoading}
        isPocketActionLoading={isPocketActionLoading}
        inventoryLoadError={inventoryLoadError}
        onUsePocket={handleUsePocket}
      />

      <section
        className={`roll-theater ${
          !rollReveal
            ? "roll-theater-idle"
            : rollReveal.showOutcome
              ? rollReveal.success
                ? "roll-theater-success"
                : "roll-theater-failure"
              : "roll-theater-pending"
        }`}
      >
        <section
          className={`activity-run-decision activity-run-decision-${runDecision.tone}`}
          aria-label="Run readiness"
        >
          <p className="activity-run-decision-kicker">Attempt readiness</p>
          <h3 className="activity-run-decision-title">{runDecision.title}</h3>
          <p className="activity-run-decision-summary">{runDecision.summary}</p>
          <div className="activity-run-decision-chips">
            <span className="activity-run-decision-chip">
              Stamina: {availableStamina}/{requiredStamina}
            </span>
            <span className="activity-run-decision-chip">
              Heat: {currentHeat} ({currentHeatRollModifier >= 0 ? "+0" : currentHeatRollModifier})
            </span>
            <span className="activity-run-decision-chip">
              Quick Slots: {readyPocketCount}
            </span>
          </div>
          <p className="activity-run-decision-note">{runDecision.note}</p>
        </section>

        <p className="roll-theater-action">
          <button
            type="button"
            className="roll-theater-button"
            onClick={runActivity}
            disabled={isBusy}
          >
            {isLoading ? "Running..." : `Roll to Attempt ${activity.name}`}
          </button>
        </p>

        {rollReveal ? (
        <section
          className={`roll-theater-body ${
            rollReveal.phase === "rolling"
              ? "roll-theater-body-rolling"
              : ""
          }`}
          aria-live="polite"
          aria-busy={rollReveal.phase === "rolling"}
        >
          <div className="roll-theater-stage">
            <p
              className={`roll-theater-verdict ${
                trayVerdict ? "" : "roll-theater-verdict-placeholder"
              } ${
                isLongTrayVerdict ? "roll-theater-verdict-compact roll-theater-verdict-warning" : ""
              }`}
              aria-hidden={trayVerdict ? undefined : true}
            >
              {rollVerdictText}
            </p>

            <div
              className={`d20-display ${
                rollReveal.phase === "rolling"
                  ? "d20-display-rolling"
                  : "d20-display-locked"
              }`}
            >
              <div
                className={`d20-display-content ${
                  rollReveal.phase === "rolling"
                    ? "d20-display-content-rolling"
                    : rollReveal.showTotal
                      ? "d20-display-content-total"
                      : rollReveal.showBonus
                        ? "d20-display-content-bonus"
                        : "d20-display-content-die"
                }`}
              >
                <span className="d20-display-value">{rollDisplayValue}</span>
              </div>
            </div>

            <div className="roll-theater-target">
              <p className="roll-theater-target-label">Target</p>
              <p className="roll-theater-target-value">
                {typeof rollReveal.targetValue === "number" ? rollReveal.targetValue : "..."}
              </p>
            </div>
          </div>
        </section>
        ) : (
          <div
            className="roll-theater-body roll-theater-body-idle"
            aria-hidden={trayVerdict ? undefined : true}
          >
            <div className="roll-theater-stage">
              <p
                className={`roll-theater-verdict ${
                  trayVerdict ? "" : "roll-theater-verdict-placeholder"
                } ${
                  isLongTrayVerdict ? "roll-theater-verdict-compact roll-theater-verdict-warning" : ""
                }`}
                aria-hidden={trayVerdict ? undefined : true}
              >
                {rollVerdictText}
              </p>
              <div className="d20-display d20-display-idle">
                <div className="d20-display-content d20-display-content-idle">
                  <span className="d20-display-value">{rollDisplayValue}</span>
                </div>
              </div>

              <div className="roll-theater-target roll-theater-target-idle">
                <p className="roll-theater-target-label">Target</p>
                <p className="roll-theater-target-value">-</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {shouldShowPendingSummary ? (
        <section className="action-result-card action-result-pending" aria-live="polite">
          <div className="activity-outcome-summary">
            <p className="activity-outcome-line">
              <strong>Status:</strong>{" "}
              {isOutcomeRevealPending ? "Revealing dice roll..." : "Resolving action..."}
            </p>
            <p className="activity-outcome-line activity-outcome-line-placeholder" aria-hidden="true">
              {"\u00A0"}
            </p>
            <p className="activity-outcome-line activity-outcome-line-placeholder" aria-hidden="true">
              {"\u00A0"}
            </p>
          </div>
        </section>
      ) : null}

      {feedback ? (
        feedback.tone === "error" && feedback.text !== "Not enough Stamina" ? (
          <section className="action-result-card action-result-error" aria-live="polite">
            <p>{feedback.text}</p>
          </section>
        ) : !lastResult ? (
          <p className={`feedback ${feedback.tone}`} aria-live="polite">
            {feedback.text}
          </p>
        ) : null
      ) : null}

      {lastResult && shouldShowOutcomeSummary ? (
        <section
          className={`action-result-card ${
            lastResult.success ? "action-result-ok" : "action-result-error"
          }`}
          aria-live="polite"
        >
          <div className="activity-outcome-summary">
            <p className="activity-outcome-line">
              <strong>Result:</strong> Roll{" "}
              {rollReveal && !rollReveal.showTotal ? "..." : lastResult.roll.total} vs target{" "}
              {rollReveal && !rollReveal.showTotal ? "..." : lastResult.roll.target}.
            </p>
            <p className="activity-outcome-line">
              <strong>{outcomeLabel}:</strong>{" "}
              {outcomeDeltaText}
            </p>
            <p
              className={`activity-outcome-line ${
                lastResult.storyProgress ? "" : "activity-outcome-line-placeholder"
              }`}
              aria-hidden={lastResult.storyProgress ? undefined : true}
            >
              <strong>Story:</strong>{" "}
              {lastResult.storyProgress
                ? lastResult.storyProgress.completed
                  ? `Chapter complete at ${lastResult.storyProgress.requiredSuccesses}/${lastResult.storyProgress.requiredSuccesses}.`
                  : `${lastResult.storyProgress.currentStreak}/${lastResult.storyProgress.requiredSuccesses} successful rolls chained.`
                : "\u00A0"}
            </p>
            <p
              className={`activity-outcome-line ${
                lastResult.loot ? "" : "activity-outcome-line-placeholder"
              }`}
              aria-hidden={lastResult.loot ? undefined : true}
            >
              <strong>Loot:</strong> {lastResult.loot ? formatLoot(lastResult.loot) : "\u00A0"}
            </p>
          </div>
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
                <strong>Stamina cost:</strong> {lastResult.staminaCost}
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
                {typeof lastResult.roll.heatRollModifier === "number"
                  ? ` + Heat ${lastResult.roll.heatRollModifier}`
                  : ""}
              </p>
              {typeof lastResult.roll.heat === "number" ? (
                <p>
                  <strong>Heat effect:</strong> Current Heat {lastResult.roll.heat} gives roll modifier{" "}
                  {lastResult.roll.heatRollModifier ?? 0}
                </p>
              ) : null}
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
                Stamina cost reduction{" "}
                {lastResult.classIdentity.passiveStaminaCostReduction ?? 0},{" "}
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
                {formatActivityDelta(lastResult.delta)}
              </p>
              <p>
                <strong>Loot:</strong> {formatLoot(lastResult.loot)}
              </p>
              {lastResult.storyProgress ? (
                <p>
                  <strong>Story progress:</strong> {lastResult.storyProgress.currentStreak}/
                  {lastResult.storyProgress.requiredSuccesses}
                  {lastResult.storyProgress.completed
                    ? " | Chapter complete"
                    : lastResult.storyProgress.resetOnFailure
                      ? " | Reset on failure"
                      : " | Chapter in progress"}
                  {lastResult.storyProgress.nextUnlockedActivityName
                    ? ` | Next unlocked: ${lastResult.storyProgress.nextUnlockedActivityName}`
                    : ""}
                </p>
              ) : null}
              <p>
                <strong>Progression:</strong> Level {lastResult.progression.levelAfter} | XP{" "}
                {lastResult.progression.xp.xp} / next level at{" "}
                {lastResult.progression.xp.nextLevelXpTarget}
                {lastResult.progression.leveledUp ? " | LEVEL UP!" : ""}
              </p>
              <p>
                <strong>Resources now:</strong> HP {lastResult.totals?.after?.hp} | Stamina{" "}
                {lastResult.totals?.after?.stamina} | Gold {lastResult.totals?.after?.gold} | XP{" "}
                {lastResult.totals?.after?.xp} | Level {lastResult.totals?.after?.level} | Renown{" "}
                {lastResult.totals?.after?.renown} | Heat {lastResult.totals?.after?.heat}
              </p>
            </div>
          </details>
        </section>
      ) : null}

      {storyOverlay ? (
        <section className="story-overlay-backdrop" aria-live="polite">
          <div className="story-overlay-card" role="dialog" aria-modal="true" aria-label="Story lore reveal">
            <p className="story-overlay-kicker">
              Story Part {storyOverlay.step}
              {storyState?.requiredSuccesses ? ` of ${storyState.requiredSuccesses}` : ""}
            </p>
            <h3 className="story-overlay-title">{storyOverlay.title}</h3>
            {storyOverlay.imageSrc ? (
              <Image
                src={storyOverlay.imageSrc}
                alt={storyOverlay.imageAlt}
                width={1600}
                height={900}
                className="story-overlay-image"
              />
            ) : (
              <div className="story-overlay-image story-overlay-image-placeholder" aria-hidden="true">
                Image placeholder
              </div>
            )}
            <p className="story-overlay-copy">{storyOverlay.text}</p>
            <p className="story-overlay-progress">
              {lastResult?.storyProgress?.completed
                ? "Chapter complete. The next story is now available if one exists."
                : `Chapter progress: ${storyState?.currentStreak ?? 0}/${storyState?.requiredSuccesses ?? 3}`}
            </p>
            <p className="story-overlay-actions">
              <button
                type="button"
                className="story-overlay-button"
                onClick={() => setStoryOverlay(null)}
              >
                Continue
              </button>
            </p>
          </div>
        </section>
      ) : null}
    </section>
  );
}
