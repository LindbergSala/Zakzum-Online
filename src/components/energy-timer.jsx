"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function formatCountdown(secondsLeft) {
  const safeSeconds = Math.max(0, Number(secondsLeft) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getSecondsUntilNext(meta) {
  if (!meta || typeof meta !== "object") {
    return 0;
  }

  if (typeof meta.secondsUntilNext === "number") {
    return meta.secondsUntilNext;
  }

  if (typeof meta.secondsUntilNextEnergy === "number") {
    return meta.secondsUntilNextEnergy;
  }

  if (typeof meta.secondsUntilNextStamina === "number") {
    return meta.secondsUntilNextStamina;
  }

  if (typeof meta.secondsUntilNextHp === "number") {
    return meta.secondsUntilNextHp;
  }

  return 0;
}

function getCurrentValue(meta) {
  if (!meta || typeof meta !== "object") {
    return 0;
  }

  if (typeof meta.currentValue === "number") {
    return meta.currentValue;
  }

  if (typeof meta.currentEnergy === "number") {
    return meta.currentEnergy;
  }

  if (typeof meta.currentStamina === "number") {
    return meta.currentStamina;
  }

  if (typeof meta.currentHp === "number") {
    return meta.currentHp;
  }

  return 0;
}

export default function EnergyTimer({
  energyMeta,
  resourceMeta = null,
  resourceLabel = "Stamina",
  showDepletedNotice = false,
  variant = "block",
  className = "",
}) {
  const meta = resourceMeta ?? energyMeta;
  const router = useRouter();
  const refreshTriggeredRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    getSecondsUntilNext(meta),
  );

  useEffect(() => {
    setSecondsLeft(getSecondsUntilNext(meta));
  }, [meta]);

  useEffect(() => {
    if (meta?.isFull) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setSecondsLeft((previousSeconds) => Math.max(0, previousSeconds - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [meta?.isFull]);

  useEffect(() => {
    if (secondsLeft > 0) {
      refreshTriggeredRef.current = false;
    }
  }, [secondsLeft]);

  useEffect(() => {
    if (meta?.isFull || secondsLeft > 0 || refreshTriggeredRef.current) {
      return;
    }

    refreshTriggeredRef.current = true;
    router.refresh();
  }, [meta?.isFull, secondsLeft, router]);

  if (!meta) {
    return null;
  }

  const timerText = meta.isFull
    ? "Next in: Full"
    : `Next in: ${formatCountdown(secondsLeft)}`;
  const isDepleted = !meta.isFull && getCurrentValue(meta) <= 0;
  const depletedNotice = `${resourceLabel} is at 0 and recovering.`;

  if (variant === "inline") {
    return (
      <span className={className}>
        {timerText}
        {showDepletedNotice && isDepleted ? ` | ${depletedNotice}` : ""}
      </span>
    );
  }

  if (meta.isFull) {
    return (
      <p>
        <strong>Next in:</strong> Full
      </p>
    );
  }

  return (
    <>
      <p>
        <strong>Next in:</strong> {formatCountdown(secondsLeft)}
      </p>
      {showDepletedNotice && isDepleted ? <p>{depletedNotice}</p> : null}
    </>
  );
}
