"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { normalizeInventoryItems } from "./inventory/inventory-logic";
import {
  getInventoryLayoutStorageKey,
  loadStoredInventoryLayout,
  resolvePocketSlots,
} from "./inventory/pocket-layout";
import { syncInventoryAction } from "./inventory/inventory-utils";
import {
  formatActivityDelta,
  formatDeltaBonus,
  formatLoot,
  formatReadableOutcomeDelta,
  formatStatWithBonus,
  getRollDisplayValue,
} from "@/lib/activity-runner-format";
import { getJson, postJson } from "@/lib/client-json";
import { getItemImagePath } from "@/lib/items/helpers";

const MIN_ROLL_ANIMATION_MS = 2000;
const ROLL_TICK_MS = 56;
const BONUS_REVEAL_DELAY_MS = 320;
const TOTAL_REVEAL_DELAY_MS = 700;
const OUTCOME_REVEAL_DELAY_MS = 980;
const DICE_THROW_SOUND_PATH = "/audio/sfx/dice-throw.mp3";
const DICE_THROW_VOLUME_RANGE = [0.82, 0.96];
const DICE_THROW_PLAYBACK_RATE_RANGE = [0.985, 1.015];

function getRandomNumberInRange(min, max) {
  return min + Math.random() * (max - min);
}

export default function ActivityRunner({
  activity,
  characterId,
  currentStamina = 0,
  requiredStamina = 0,
  currentHeat = 0,
  currentHeatRollModifier = 0,
  nextHeatThreshold = null,
  expectedHeatBuildUp = null,
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPocketActionLoading, setIsPocketActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [rollReveal, setRollReveal] = useState(null);
  const [availableStamina, setAvailableStamina] = useState(currentStamina);
  const [trayMessage, setTrayMessage] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryLoadError, setInventoryLoadError] = useState("");
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [pocketPlacements, setPocketPlacements] = useState({});
  const rollingIntervalRef = useRef(null);
  const revealTimeoutsRef = useRef([]);
  const runSequenceRef = useRef(0);
  const activeDiceAudioRef = useRef([]);

  function removeActiveDiceAudio(audio) {
    activeDiceAudioRef.current = activeDiceAudioRef.current.filter(
      (activeAudio) => activeAudio !== audio,
    );
  }

  function stopActiveDiceAudio() {
    activeDiceAudioRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeDiceAudioRef.current = [];
  }

  function playDiceThrowSound() {
    if (typeof Audio === "undefined") {
      return;
    }

    const audio = new Audio(DICE_THROW_SOUND_PATH);
    audio.preload = "auto";
    audio.volume = getRandomNumberInRange(...DICE_THROW_VOLUME_RANGE);
    audio.playbackRate = getRandomNumberInRange(...DICE_THROW_PLAYBACK_RATE_RANGE);

    if ("preservesPitch" in audio) {
      audio.preservesPitch = false;
    }

    if ("mozPreservesPitch" in audio) {
      audio.mozPreservesPitch = false;
    }

    if ("webkitPreservesPitch" in audio) {
      audio.webkitPreservesPitch = false;
    }

    const cleanup = () => {
      audio.removeEventListener("ended", cleanup);
      audio.removeEventListener("error", cleanup);
      audio.pause();
      audio.currentTime = 0;
      removeActiveDiceAudio(audio);
    };

    audio.addEventListener("ended", cleanup);
    audio.addEventListener("error", cleanup);
    activeDiceAudioRef.current.push(audio);

    void audio.play().catch(() => {
      cleanup();
    });
  }

  function clearRevealTimers() {
    if (rollingIntervalRef.current) {
      clearInterval(rollingIntervalRef.current);
      rollingIntervalRef.current = null;
    }

    revealTimeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    revealTimeoutsRef.current = [];
  }

  function queueRevealStep(callback, delay) {
    const timeoutId = setTimeout(() => {
      revealTimeoutsRef.current = revealTimeoutsRef.current.filter(
        (activeTimeoutId) => activeTimeoutId !== timeoutId,
      );
      callback();
    }, delay);
    revealTimeoutsRef.current.push(timeoutId);
  }

  function startRollingPreview(sequenceId) {
    clearRevealTimers();

    setRollReveal({
      phase: "rolling",
      dieValue: Math.floor(Math.random() * 20) + 1,
      bonusValue: null,
      totalValue: null,
      targetValue: null,
      showBonus: false,
      showTotal: false,
      showOutcome: false,
      success: null,
    });

    rollingIntervalRef.current = setInterval(() => {
      setRollReveal((current) => {
        if (!current || sequenceId !== runSequenceRef.current) {
          return current;
        }

        return {
          ...current,
          dieValue: Math.floor(Math.random() * 20) + 1,
        };
      });
    }, ROLL_TICK_MS);
  }

  function revealResolvedRoll(result, sequenceId, startedAt) {
    const elapsed = Date.now() - startedAt;
    const lockDelay = Math.max(0, MIN_ROLL_ANIMATION_MS - elapsed);
    const resolvedBonus = result.roll.totalRollBonus ?? result.roll.statModifier ?? 0;

    queueRevealStep(() => {
      if (sequenceId !== runSequenceRef.current) {
        return;
      }

      if (rollingIntervalRef.current) {
        clearInterval(rollingIntervalRef.current);
        rollingIntervalRef.current = null;
      }

      setRollReveal({
        phase: "locked",
        dieValue: result.roll.value,
        bonusValue: resolvedBonus,
        totalValue: result.roll.total,
        targetValue: result.roll.target,
        showBonus: false,
        showTotal: false,
        showOutcome: false,
        success: result.success,
      });
    }, lockDelay);

    queueRevealStep(() => {
      if (sequenceId !== runSequenceRef.current) {
        return;
      }

      setRollReveal((current) =>
        current
          ? {
              ...current,
              showBonus: true,
            }
          : current,
      );
    }, lockDelay + BONUS_REVEAL_DELAY_MS);

    queueRevealStep(() => {
      if (sequenceId !== runSequenceRef.current) {
        return;
      }

      setRollReveal((current) =>
        current
          ? {
              ...current,
              showTotal: true,
            }
          : current,
      );
    }, lockDelay + TOTAL_REVEAL_DELAY_MS);

    queueRevealStep(() => {
      if (sequenceId !== runSequenceRef.current) {
        return;
      }

      setRollReveal((current) =>
        current
          ? {
              ...current,
              showOutcome: true,
              phase: "resolved",
            }
          : current,
      );
    }, lockDelay + OUTCOME_REVEAL_DELAY_MS);
  }

  useEffect(() => {
    setAvailableStamina(currentStamina);
  }, [currentStamina]);

  useEffect(() => {
    if (!characterId) {
      setPocketPlacements({});
      setInventoryItems([]);
      setIsInventoryLoading(false);
      return undefined;
    }

    let isCancelled = false;

    async function loadInventorySnapshot() {
      try {
        setIsInventoryLoading(true);
        const { ok, data } = await getJson("/api/game/inventory");

        if (!ok) {
          throw new Error(data.message ?? "Could not load inventory pockets.");
        }

        if (isCancelled) {
          return;
        }

        setInventoryItems(normalizeInventoryItems(data.items ?? []));
        setInventoryLoadError("");
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setInventoryItems([]);
        setInventoryLoadError(error.message ?? "Could not load inventory pockets.");
      } finally {
        if (!isCancelled) {
          setIsInventoryLoading(false);
        }
      }
    }

    setPocketPlacements(loadStoredInventoryLayout(characterId).pocketPlacements);
    void loadInventorySnapshot();

    function handleStorage(event) {
      if (event.key && event.key !== getInventoryLayoutStorageKey(characterId)) {
        return;
      }

      setPocketPlacements(loadStoredInventoryLayout(characterId).pocketPlacements);
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      isCancelled = true;
      window.removeEventListener("storage", handleStorage);
    };
  }, [characterId]);

  useEffect(() => {
    if (currentStamina >= requiredStamina) {
      setTrayMessage(null);
    }
  }, [currentStamina, requiredStamina]);

  useEffect(() => {
    return () => {
      clearRevealTimers();
      stopActiveDiceAudio();
    };
  }, []);

  const rollDisplayValue = getRollDisplayValue(rollReveal);
  const isBusy = isLoading || isPocketActionLoading;
  const pocketSlots = useMemo(
    () => resolvePocketSlots({ pocketPlacements, items: inventoryItems }),
    [inventoryItems, pocketPlacements],
  );
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
      setInventoryItems(normalizeInventoryItems(data.items ?? []));
      setAvailableStamina(Number.isFinite(nextStamina) ? nextStamina : availableStamina);
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
      clearRevealTimers();
      stopActiveDiceAudio();
      setRollReveal(null);
      setLastResult(null);
      setFeedback(null);
      setTrayMessage("Not enough Stamina");
      return;
    }

    const startedAt = Date.now();
    const sequenceId = runSequenceRef.current + 1;
    runSequenceRef.current = sequenceId;

    setIsLoading(true);
    setFeedback(null);
    setLastResult(null);
    setTrayMessage(null);
    startRollingPreview(sequenceId);
    playDiceThrowSound();

    try {
      const { ok, data } = await postJson("/api/game/activities", {
        activityId: activity.id,
      });

      if (!ok) {
        setLastResult(null);
        clearRevealTimers();
        setRollReveal(null);
        stopActiveDiceAudio();
        if (typeof data.message === "string" && data.message.startsWith("Not enough Stamina")) {
          setTrayMessage("Not enough Stamina");
          setFeedback(null);
          return;
        }
        setFeedback({ tone: "error", text: data.message });
        return;
      }

      setLastResult(data.result ?? null);
      setAvailableStamina(data.result?.totals?.after?.stamina ?? availableStamina);
      if (data.result) {
        revealResolvedRoll(data.result, sequenceId, startedAt);
      } else {
        clearRevealTimers();
        setRollReveal(null);
      }
      setFeedback({ tone: "ok", text: data.message });
      router.refresh();
    } catch {
      setLastResult(null);
      clearRevealTimers();
      setRollReveal(null);
      stopActiveDiceAudio();
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

      <section className="activity-pockets">
        <div className="activity-pockets-header">
          <p className="activity-pockets-kicker">Quick Slots</p>
          <p className="activity-pockets-copy">
            Assigned stackable consumables are available here for fast use before you roll.
          </p>
        </div>
        <div className="activity-pockets-grid">
          {pocketSlots.map((slot) => (
            <article
              className={`activity-pocket-slot ${slot.item ? "activity-pocket-slot-filled" : ""}`}
              key={`activity-pocket-${slot.slotIndex}`}
            >
              <p className="activity-pocket-slot-label">Slot {slot.slotIndex + 1}</p>
              {slot.item ? (
                <>
                  <div className="activity-pocket-slot-media">
                    <div className="activity-pocket-slot-artwork-wrap" aria-hidden="true">
                      {getItemImagePath(slot.item.itemId) ? (
                        <Image
                          src={getItemImagePath(slot.item.itemId)}
                          alt=""
                          fill
                          unoptimized
                          sizes="64px"
                          className="activity-pocket-slot-artwork"
                        />
                      ) : (
                        <span className="activity-pocket-slot-artwork-fallback">?</span>
                      )}
                    </div>
                    <div className="activity-pocket-slot-copy-wrap">
                      <p className="activity-pocket-slot-name">{slot.item.itemName}</p>
                      <p className="activity-pocket-slot-meta">Ready x{slot.item.displayQuantity}</p>
                      <p className="activity-pocket-slot-owned">Owned x{slot.item.quantity}</p>
                    </div>
                  </div>
                  <p className="activity-pocket-slot-effect">{slot.item.effectLabel}</p>
                  <button
                    type="button"
                    className="activity-pocket-slot-button"
                    onClick={() => handleUsePocket(slot.slotIndex)}
                    disabled={isBusy}
                  >
                    {isPocketActionLoading ? "Using..." : "Use 1"}
                  </button>
                </>
              ) : (
                <p className="activity-pocket-slot-empty">
                  {isInventoryLoading
                    ? "Loading consumables..."
                    : slot.itemKey
                      ? "Assigned consumable is out of stock."
                      : "Assign a stackable consumable in Inventory > Quick Slots."}
                </p>
              )}
            </article>
          ))}
        </div>
        {inventoryLoadError ? (
          <p className="feedback error" aria-live="polite">
            {inventoryLoadError}
          </p>
        ) : null}
      </section>

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
    </section>
  );
}
