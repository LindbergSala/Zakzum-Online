"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  CHARACTER_CLASS_OPTIONS,
  CHARACTER_RACE_OPTIONS,
} from "@/lib/character-data";
import {
  getAvatarOptionsForRace,
} from "@/lib/character-avatars";
import { getClassPassive } from "@/lib/class-identity";
import { getRacePassive } from "@/lib/race-identity";
import styles from "./character-create-form.module.css";

function buildInitialFormData() {
  const initialRace = CHARACTER_RACE_OPTIONS[0].value;

  return {
    name: "",
    characterRace: initialRace,
    characterClass: CHARACTER_CLASS_OPTIONS[0].value,
    avatarImage: "",
  };
}

function probeImageExists(source) {
  return new Promise((resolve) => {
    const probeImage = new window.Image();
    probeImage.onload = () => resolve(true);
    probeImage.onerror = () => resolve(false);
    probeImage.src = source;
  });
}

export default function CharacterCreateForm() {
  const router = useRouter();
  const [formData, setFormData] = useState(buildInitialFormData);
  const [activeAvatarIndex, setActiveAvatarIndex] = useState(0);
  const [availableAvatarsByRace, setAvailableAvatarsByRace] = useState({});
  const [touchStartX, setTouchStartX] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const classPassive = getClassPassive(formData.characterClass);
  const racePassive = getRacePassive(formData.characterRace);
  const raceAvatarCandidates = useMemo(
    () => getAvatarOptionsForRace(formData.characterRace),
    [formData.characterRace],
  );
  const raceAvatarOptions = useMemo(
    () => availableAvatarsByRace[formData.characterRace] ?? [],
    [availableAvatarsByRace, formData.characterRace],
  );
  const isAvatarRaceLoading =
    availableAvatarsByRace[formData.characterRace] === undefined &&
    raceAvatarCandidates.length > 0;
  const hasRaceAvatars = raceAvatarOptions.length > 0;

  function updateField(key, value) {
    setFormData((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function selectAvatarByIndex(index) {
    const safeIndex = Math.max(
      0,
      Math.min(index, Math.max(0, raceAvatarOptions.length - 1)),
    );
    const avatarImage = raceAvatarOptions[safeIndex] ?? "";

    setActiveAvatarIndex(safeIndex);
    updateField("avatarImage", avatarImage);
  }

  function goToNextAvatar() {
    if (!hasRaceAvatars) {
      return;
    }

    const nextIndex = (activeAvatarIndex + 1) % raceAvatarOptions.length;
    selectAvatarByIndex(nextIndex);
  }

  function goToPreviousAvatar() {
    if (!hasRaceAvatars) {
      return;
    }

    const previousIndex =
      (activeAvatarIndex - 1 + raceAvatarOptions.length) %
      raceAvatarOptions.length;
    selectAvatarByIndex(previousIndex);
  }

  function handleSwipeStart(event) {
    if (!hasRaceAvatars) {
      return;
    }

    setTouchStartX(event.touches[0]?.clientX ?? null);
  }

  function handleSwipeEnd(event) {
    if (!hasRaceAvatars || touchStartX == null) {
      return;
    }

    const touchEndX = event.changedTouches[0]?.clientX;

    if (typeof touchEndX !== "number") {
      setTouchStartX(null);
      return;
    }

    const swipeDistance = touchEndX - touchStartX;
    const swipeThreshold = 40;

    if (Math.abs(swipeDistance) >= swipeThreshold) {
      if (swipeDistance < 0) {
        goToNextAvatar();
      } else {
        goToPreviousAvatar();
      }
    }

    setTouchStartX(null);
  }

  useEffect(() => {
    let isDisposed = false;
    const raceKey = formData.characterRace;

    if (availableAvatarsByRace[raceKey] !== undefined) {
      return undefined;
    }

    if (raceAvatarCandidates.length === 0) {
      setAvailableAvatarsByRace((previous) => ({
        ...previous,
        [raceKey]: [],
      }));
      return undefined;
    }

    async function resolveAvailableAvatars() {
      const checks = await Promise.all(
        raceAvatarCandidates.map((candidate) => probeImageExists(candidate)),
      );

      if (isDisposed) {
        return;
      }

      const availableCandidates = raceAvatarCandidates.filter(
        (_, index) => checks[index],
      );

      setAvailableAvatarsByRace((previous) => {
        if (previous[raceKey] !== undefined) {
          return previous;
        }

        return {
          ...previous,
          [raceKey]: availableCandidates,
        };
      });
    }

    resolveAvailableAvatars();

    return () => {
      isDisposed = true;
    };
  }, [availableAvatarsByRace, formData.characterRace, raceAvatarCandidates]);

  useEffect(() => {
    if (isAvatarRaceLoading) {
      return;
    }

    if (!hasRaceAvatars) {
      setActiveAvatarIndex(0);
      setFormData((previous) =>
        previous.avatarImage
          ? {
              ...previous,
              avatarImage: "",
            }
          : previous,
      );
      return;
    }

    const selectedIndex = raceAvatarOptions.indexOf(formData.avatarImage);

    if (selectedIndex >= 0) {
      setActiveAvatarIndex(selectedIndex);
      return;
    }

    setActiveAvatarIndex(0);
    setFormData((previous) => ({
      ...previous,
      avatarImage: raceAvatarOptions[0] ?? "",
    }));
  }, [
    formData.avatarImage,
    hasRaceAvatars,
    isAvatarRaceLoading,
    raceAvatarOptions,
  ]);

  const previousAvatarIndex = hasRaceAvatars
    ? (activeAvatarIndex - 1 + raceAvatarOptions.length) % raceAvatarOptions.length
    : 0;
  const nextAvatarIndex = hasRaceAvatars
    ? (activeAvatarIndex + 1) % raceAvatarOptions.length
    : 0;

  async function onSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setFeedback(null);
    setFieldErrors({});

    const payload = {
      name: formData.name,
      characterRace: formData.characterRace,
      characterClass: formData.characterClass,
      ...(formData.avatarImage
        ? {
            avatarImage: formData.avatarImage,
          }
        : {}),
    };

    try {
      const response = await fetch("/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setFieldErrors(data.errors);
        }
        setFeedback({ tone: "error", text: data.message });
        return;
      }

      setFeedback({ tone: "ok", text: "Character created. Redirecting..." });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: "Could not create character. Try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.identityGrid}>
        <label className={styles.field} htmlFor="name">
          Name
          <input
            className={styles.input}
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={32}
            value={formData.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
        </label>

        <label className={styles.field} htmlFor="characterRace">
          Race
          <select
            className={styles.input}
            id="characterRace"
            name="characterRace"
            value={formData.characterRace}
            onChange={(event) => updateField("characterRace", event.target.value)}
          >
            {CHARACTER_RACE_OPTIONS.map((characterRace) => (
              <option key={characterRace.value} value={characterRace.value}>
                {characterRace.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field} htmlFor="characterClass">
          Class
          <select
            className={styles.input}
            id="characterClass"
            name="characterClass"
            value={formData.characterClass}
            onChange={(event) => updateField("characterClass", event.target.value)}
          >
            {CHARACTER_CLASS_OPTIONS.map((characterClass) => (
              <option key={characterClass.value} value={characterClass.value}>
                {characterClass.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className={styles.avatarCard}>
        <div className={styles.avatarHeadingRow}>
          <p className={styles.avatarTitle}>Character portrait</p>
          {isAvatarRaceLoading ? (
            <p className={styles.avatarMeta}>Loading portraits...</p>
          ) : hasRaceAvatars ? (
            <p className={styles.avatarMeta}>
              {activeAvatarIndex + 1}/{raceAvatarOptions.length}
            </p>
          ) : (
            <p className={styles.avatarMeta}>Coming soon for this race</p>
          )}
        </div>

        {isAvatarRaceLoading ? (
          <p className={styles.avatarEmptyText}>Loading race portraits...</p>
        ) : hasRaceAvatars ? (
          <>
            <div
              className={styles.avatarSwipeStage}
              aria-label="Swipe portraits"
              onTouchStart={handleSwipeStart}
              onTouchEnd={handleSwipeEnd}
            >
              <button
                type="button"
                className={`${styles.avatarSwipeCard} ${styles.avatarSwipeSide}`}
                onClick={() => selectAvatarByIndex(previousAvatarIndex)}
                aria-label="Select previous portrait"
              >
                <Image
                  src={raceAvatarOptions[previousAvatarIndex]}
                  alt={`${formData.characterRace} previous portrait`}
                  width={150}
                  height={150}
                  className={styles.avatarSwipeImage}
                />
              </button>

              <button
                type="button"
                className={`${styles.avatarSwipeCard} ${styles.avatarSwipeCenter}`}
                onClick={() => selectAvatarByIndex(activeAvatarIndex)}
                aria-label="Current selected portrait"
              >
                <Image
                  src={raceAvatarOptions[activeAvatarIndex]}
                  alt={`${formData.characterRace} current portrait`}
                  width={190}
                  height={190}
                  className={styles.avatarSwipeImage}
                />
              </button>

              <button
                type="button"
                className={`${styles.avatarSwipeCard} ${styles.avatarSwipeSide}`}
                onClick={() => selectAvatarByIndex(nextAvatarIndex)}
                aria-label="Select next portrait"
              >
                <Image
                  src={raceAvatarOptions[nextAvatarIndex]}
                  alt={`${formData.characterRace} next portrait`}
                  width={150}
                  height={150}
                  className={styles.avatarSwipeImage}
                />
              </button>
            </div>

            <div className={styles.avatarControls}>
              <button
                className={styles.avatarControlButton}
                type="button"
                onClick={goToPreviousAvatar}
              >
                Previous
              </button>
              <button
                className={styles.avatarControlButton}
                type="button"
                onClick={goToNextAvatar}
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <p className={styles.avatarEmptyText}>
            Portraits for {formData.characterRace.toLowerCase()} will be added later.
          </p>
        )}
      </section>

      {fieldErrors.name ? (
        <p className={`${styles.feedback} ${styles.feedbackError}`}>
          {fieldErrors.name[0]}
        </p>
      ) : null}
      {fieldErrors.characterRace ? (
        <p className={`${styles.feedback} ${styles.feedbackError}`}>
          {fieldErrors.characterRace[0]}
        </p>
      ) : null}
      {fieldErrors.characterClass ? (
        <p className={`${styles.feedback} ${styles.feedbackError}`}>
          {fieldErrors.characterClass[0]}
        </p>
      ) : null}
      {fieldErrors.avatarImage ? (
        <p className={`${styles.feedback} ${styles.feedbackError}`}>
          {fieldErrors.avatarImage[0]}
        </p>
      ) : null}

      <div className={styles.classInfoCard}>
        <p className={`${styles.feedback} ${styles.feedbackOk}`}>
          Starting stats: STR 1, DEX 1, CON 1, INT 1, WIS 1, CHA 1.
        </p>
        <p className={`${styles.feedback} ${styles.feedbackOk}`}>
          On each level-up, you gain +1 unspent stat point to assign.
        </p>
        <p className={`${styles.feedback} ${styles.feedbackOk}`}>
          Class passive: <strong>{classPassive.name}</strong> - {classPassive.description}
        </p>
        <p className={`${styles.feedback} ${styles.feedbackOk}`}>
          Racial passive: <strong>{racePassive.name}</strong> - {racePassive.description}
        </p>
      </div>

      <button className={styles.submitButton} disabled={isLoading} type="submit">
        {isLoading ? "Creating character..." : "Create character"}
      </button>

      {feedback ? (
        <p
          className={`${styles.feedback} ${
            feedback.tone === "error" ? styles.feedbackError : styles.feedbackOk
          }`}
        >
          {feedback.text}
        </p>
      ) : null}
    </form>
  );
}
