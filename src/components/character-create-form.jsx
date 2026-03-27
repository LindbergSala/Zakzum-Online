"use client";

import CharacterAvatarSelector from "@/components/character-avatar-selector";
import { useCharacterCreateForm } from "@/components/use-character-create-form";
import {
  CHARACTER_BACKGROUND_OPTIONS,
  CHARACTER_CLASS_OPTIONS,
  CHARACTER_RACE_OPTIONS,
} from "@/lib/character-data";
import styles from "./character-create-form.module.css";

const FIELD_ERROR_KEYS = [
  "name",
  "characterRace",
  "characterClass",
  "characterBackground",
  "backgroundLore",
  "avatarImage",
];

export default function CharacterCreateForm() {
  const {
    formData,
    updateField,
    isLoading,
    feedback,
    fieldErrors,
    classPassive,
    racePassive,
    backgroundProfile,
    backgroundStartBonusLabel,
    raceAvatarOptions,
    hasRaceAvatars,
    activeAvatarIndex,
    previousAvatarIndex,
    nextAvatarIndex,
    previousAvatarPath,
    currentAvatarPath,
    nextAvatarPath,
    selectAvatarByIndex,
    goToNextAvatar,
    goToPreviousAvatar,
    handleSwipeStart,
    handleSwipeEnd,
    onSubmit,
  } = useCharacterCreateForm();

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

        <label className={styles.field} htmlFor="characterBackground">
          Background
          <select
            className={styles.input}
            id="characterBackground"
            name="characterBackground"
            value={formData.characterBackground}
            onChange={(event) => updateField("characterBackground", event.target.value)}
          >
            {CHARACTER_BACKGROUND_OPTIONS.map((characterBackground) => (
              <option key={characterBackground.value} value={characterBackground.value}>
                {characterBackground.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <CharacterAvatarSelector
        characterRace={formData.characterRace}
        hasRaceAvatars={hasRaceAvatars}
        raceAvatarOptions={raceAvatarOptions}
        activeAvatarIndex={activeAvatarIndex}
        previousAvatarIndex={previousAvatarIndex}
        nextAvatarIndex={nextAvatarIndex}
        previousAvatarPath={previousAvatarPath}
        currentAvatarPath={currentAvatarPath}
        nextAvatarPath={nextAvatarPath}
        onSwipeStart={handleSwipeStart}
        onSwipeEnd={handleSwipeEnd}
        onSelectAvatar={selectAvatarByIndex}
        onPreviousAvatar={goToPreviousAvatar}
        onNextAvatar={goToNextAvatar}
      />

      <section className={styles.backgroundLoreCard}>
        <p className={styles.backgroundLoreKicker}>Character background</p>
        <h3 className={styles.backgroundLoreTitle}>{backgroundProfile.name}</h3>
        <label className={styles.field} htmlFor="backgroundLore">
          <textarea
            className={`${styles.input} ${styles.backgroundLoreInput}`}
            id="backgroundLore"
            name="backgroundLore"
            aria-label="Background lore"
            value={formData.backgroundLore}
            onChange={(event) => updateField("backgroundLore", event.target.value)}
            rows={8}
          />
        </label>
      </section>

      {FIELD_ERROR_KEYS.map((fieldKey) =>
        fieldErrors[fieldKey] ? (
          <p key={fieldKey} className={`${styles.feedback} ${styles.feedbackError}`}>
            {fieldErrors[fieldKey][0]}
          </p>
        ) : null,
      )}

      <div className={styles.classInfoCard}>
        <p className={`${styles.feedback} ${styles.feedbackOk}`}>
          Base stats start at STR 1, DEX 1, CON 1, INT 1, WIS 1, CHA 1.
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
        <p className={`${styles.feedback} ${styles.feedbackOk}`}>
          Background: <strong>{backgroundProfile.name}</strong> -{" "}
          {backgroundProfile.description}
        </p>
        <p className={`${styles.feedback} ${styles.feedbackOk}`}>
          Background stat bonus: <strong>{backgroundStartBonusLabel}</strong>
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
