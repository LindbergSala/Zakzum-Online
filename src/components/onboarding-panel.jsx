"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./onboarding-panel.module.css";

function StepBadge({ done }) {
  return (
    <span
      className={`${styles.stepBadge} ${done ? styles.stepDone : styles.stepPending}`}
      aria-hidden="true"
    >
      {done ? "Done" : "Next"}
    </span>
  );
}

function RewardClaimOverlay({ isOpen, rewardGold, onClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlayRoot} role="dialog" aria-modal="true">
      <div className={styles.overlayBackdrop} />
      <section className={styles.overlayCard}>
        <p className={styles.overlayKicker}>Reward Claimed</p>
        <h3 className={styles.overlayTitle}>Starter bonus received</h3>
        <p className={styles.overlayText}>
          You got <strong>{rewardGold} Gold</strong>. Onboarding is now complete.
        </p>
        <button
          type="button"
          className={styles.overlayAction}
          onClick={onClose}
        >
          Continue
        </button>
      </section>
    </div>
  );
}

export default function OnboardingPanel({ model }) {
  const router = useRouter();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [showRewardOverlay, setShowRewardOverlay] = useState(false);
  const [claimedRewardGold, setClaimedRewardGold] = useState(model?.rewardGold ?? 50);

  if (!model) {
    return null;
  }

  async function handleClaimReward() {
    setIsClaiming(true);
    setClaimError("");

    try {
      const response = await fetch("/api/game/onboarding/claim-reward", {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        setClaimError(payload.message ?? "Reward could not be claimed right now.");
        return;
      }

      if (!payload.claimed) {
        setClaimError(payload.message ?? "Reward was already claimed.");
        router.refresh();
        return;
      }

      setClaimedRewardGold(Number(payload.rewardGold) || (model.rewardGold ?? 50));
      setShowRewardOverlay(true);
    } catch {
      setClaimError("Reward claim failed. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  }

  function handleCloseRewardOverlay() {
    setShowRewardOverlay(false);
    router.refresh();
  }

  return (
    <>
      <section className={`${styles.panel} ${model.compact ? styles.compact : ""}`}>
        <p className={styles.kicker}>New Player Guide</p>
        <h2 className={styles.title}>{model.title}</h2>
        <p className={styles.intro}>{model.intro}</p>

        <div className={styles.currentStepCard}>
          <p className={styles.stepLabel}>Current step</p>
          <p className={styles.stepValue}>{model.currentStep}</p>
        </div>

        <div className={styles.nextStepCard}>
          <p className={styles.stepLabel}>Next recommended action</p>
          <p className={styles.stepValue}>{model.nextStep}</p>
          {model.allowRewardClaim ? (
            <button
              type="button"
              className={styles.primaryActionButton}
              onClick={handleClaimReward}
              disabled={isClaiming}
            >
              {isClaiming ? "Claiming..." : "Claim Reward"}
            </button>
          ) : (
            <Link className={styles.primaryAction} href={model.primaryAction.href}>
              {model.primaryAction.label}
            </Link>
          )}
          {claimError ? (
            <p className={styles.claimError} aria-live="polite">
              {claimError}
            </p>
          ) : null}
        </div>

        {!model.compact ? (
          <ul className={styles.stepList}>
            {model.steps.map((step) => (
              <li className={styles.stepListItem} key={step.id}>
                <StepBadge done={step.done} />
                <span>{step.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.compactHint}>
            Onboarding is complete. You can keep this as a quick progression checklist.
          </p>
        )}
      </section>

      <RewardClaimOverlay
        isOpen={showRewardOverlay}
        rewardGold={claimedRewardGold}
        onClose={handleCloseRewardOverlay}
      />
    </>
  );
}
