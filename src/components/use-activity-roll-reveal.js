"use client";

import { useEffect, useRef, useState } from "react";

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

export function useActivityRollReveal() {
  const [rollReveal, setRollReveal] = useState(null);
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

  function beginRollSequence() {
    const sequenceId = runSequenceRef.current + 1;
    runSequenceRef.current = sequenceId;
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
    playDiceThrowSound();

    return sequenceId;
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

  function resetRollReveal() {
    clearRevealTimers();
    stopActiveDiceAudio();
    setRollReveal(null);
  }

  useEffect(() => {
    return () => {
      clearRevealTimers();
      stopActiveDiceAudio();
    };
  }, []);

  return {
    rollReveal,
    beginRollSequence,
    revealResolvedRoll,
    resetRollReveal,
  };
}