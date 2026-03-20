"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  CHARACTER_CLASS_OPTIONS,
  CHARACTER_RACE_OPTIONS,
} from "@/lib/character-data";
import {
  getAvatarOptionsForRace,
  hasAvatarOptionsForRace,
} from "@/lib/character-avatars";
import { getClassPassive } from "@/lib/class-identity";
import { getRacePassive } from "@/lib/race-identity";
import styles from "./character-create-form.module.css";

function buildInitialFormData() {
  const initialRace = CHARACTER_RACE_OPTIONS[0].value;
  const initialAvatar = getAvatarOptionsForRace(initialRace)[0] ?? "";

  return {
    name: "",
    characterRace: initialRace,
    characterClass: CHARACTER_CLASS_OPTIONS[0].value,
    avatarImage: initialAvatar,
  };
}

export default function CharacterCreateForm() {
  const router = useRouter();
  const avatarCarouselRef = useRef(null);
  const [formData, setFormData] = useState(buildInitialFormData);
  const [activeAvatarIndex, setActiveAvatarIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const classPassive = getClassPassive(formData.characterClass);
  const racePassive = getRacePassive(formData.characterRace);
  const raceAvatarOptions = useMemo(
    () => getAvatarOptionsForRace(formData.characterRace),
    [formData.characterRace],
  );
  const hasRaceAvatars = hasAvatarOptionsForRace(formData.characterRace);

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

  function scrollAvatarIntoView(index) {
    if (!avatarCarouselRef.current) {
      return;
    }

    const optionElement = avatarCarouselRef.current.querySelector(
      `[data-avatar-index="${index}"]`,
    );

    if (!optionElement) {
      return;
    }

    optionElement.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }

  function goToNextAvatar() {
    if (!hasRaceAvatars) {
      return;
    }

    const nextIndex = (activeAvatarIndex + 1) % raceAvatarOptions.length;
    selectAvatarByIndex(nextIndex);
    scrollAvatarIntoView(nextIndex);
  }

  function goToPreviousAvatar() {
    if (!hasRaceAvatars) {
      return;
    }

    const previousIndex =
      (activeAvatarIndex - 1 + raceAvatarOptions.length) %
      raceAvatarOptions.length;
    selectAvatarByIndex(previousIndex);
    scrollAvatarIntoView(previousIndex);
  }

  useEffect(() => {
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
    formData.characterRace,
    hasRaceAvatars,
    raceAvatarOptions,
  ]);

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
          {hasRaceAvatars ? (
            <p className={styles.avatarMeta}>
              {activeAvatarIndex + 1}/{raceAvatarOptions.length}
            </p>
          ) : (
            <p className={styles.avatarMeta}>Coming soon for this race</p>
          )}
        </div>

        {hasRaceAvatars ? (
          <>
            <div className={styles.avatarPreviewWrap}>
              <Image
                src={raceAvatarOptions[activeAvatarIndex]}
                alt={`${formData.characterRace} portrait preview ${activeAvatarIndex + 1}`}
                width={280}
                height={280}
                className={styles.avatarPreview}
                priority
              />
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

            <div
              ref={avatarCarouselRef}
              className={styles.avatarCarousel}
              aria-label="Swipe portraits"
            >
              {raceAvatarOptions.map((avatarImage, index) => (
                <button
                  key={avatarImage}
                  type="button"
                  data-avatar-index={index}
                  className={`${styles.avatarOption} ${
                    index === activeAvatarIndex ? styles.avatarOptionActive : ""
                  }`}
                  onClick={() => {
                    selectAvatarByIndex(index);
                    scrollAvatarIntoView(index);
                  }}
                >
                  <Image
                    src={avatarImage}
                    alt={`${formData.characterRace} portrait option ${index + 1}`}
                    width={110}
                    height={110}
                    className={styles.avatarOptionImage}
                  />
                </button>
              ))}
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
