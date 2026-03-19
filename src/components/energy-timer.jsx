"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function formatCountdown(secondsLeft) {
  const safeSeconds = Math.max(0, Number(secondsLeft) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function EnergyTimer({ energyMeta, variant = "block", className = "" }) {
  const router = useRouter();
  const refreshTriggeredRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    energyMeta?.secondsUntilNextEnergy ?? 0,
  );

  useEffect(() => {
    if (energyMeta?.isFull) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setSecondsLeft((previousSeconds) => Math.max(0, previousSeconds - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [energyMeta?.isFull]);

  useEffect(() => {
    if (secondsLeft > 0) {
      refreshTriggeredRef.current = false;
    }
  }, [secondsLeft]);

  useEffect(() => {
    if (energyMeta?.isFull || secondsLeft > 0 || refreshTriggeredRef.current) {
      return;
    }

    refreshTriggeredRef.current = true;
    router.refresh();
  }, [energyMeta?.isFull, secondsLeft, router]);

  if (!energyMeta) {
    return null;
  }

  const timerText = energyMeta.isFull
    ? "Next Energy: Full"
    : `Next Energy: in ${formatCountdown(secondsLeft)}`;

  if (variant === "inline") {
    return <span className={className}>{timerText}</span>;
  }

  if (energyMeta.isFull) {
    return (
      <p>
        <strong>Next Energy:</strong> Full
      </p>
    );
  }

  return (
    <p>
      <strong>Next Energy:</strong> in {formatCountdown(secondsLeft)}
    </p>
  );
}
