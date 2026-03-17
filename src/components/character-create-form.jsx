"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  calculateCharacterPointBuyCost,
  CHARACTER_CLASS_OPTIONS,
  CHARACTER_POINT_BUY_BUDGET,
  CHARACTER_POINT_BUY_MAX_STAT,
  CHARACTER_POINT_BUY_MIN_STAT,
  CHARACTER_RACE_OPTIONS,
  CHARACTER_STAT_FIELDS,
} from "@/lib/character-data";
import {
  formatClassStartBonusLabel,
  getClassPassive,
} from "@/lib/class-identity";
import styles from "./character-create-form.module.css";

const DEFAULT_STAT_VALUE = CHARACTER_POINT_BUY_MIN_STAT;
const CHARACTER_STAT_KEY_SET = new Set(
  CHARACTER_STAT_FIELDS.map((field) => field.key),
);

function buildInitialFormData() {
  const stats = Object.fromEntries(
    CHARACTER_STAT_FIELDS.map((field) => [field.key, DEFAULT_STAT_VALUE]),
  );

  return {
    name: "",
    characterRace: CHARACTER_RACE_OPTIONS[0].value,
    characterClass: CHARACTER_CLASS_OPTIONS[0].value,
    ...stats,
  };
}

export default function CharacterCreateForm() {
  const router = useRouter();
  const [formData, setFormData] = useState(buildInitialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const pointBuyCost = calculateCharacterPointBuyCost(formData);
  const rawPointsRemaining =
    pointBuyCost === null ? null : CHARACTER_POINT_BUY_BUDGET - pointBuyCost;
  const pointsRemaining =
    rawPointsRemaining === null ? null : Math.max(0, rawPointsRemaining);
  const isOverBudget = rawPointsRemaining !== null && rawPointsRemaining < 0;
  const classStartBonus = formatClassStartBonusLabel(formData.characterClass);
  const classPassive = getClassPassive(formData.characterClass);

  function updateField(key, value) {
    if (!CHARACTER_STAT_KEY_SET.has(key)) {
      setFormData((previous) => ({
        ...previous,
        [key]: value,
      }));
      return;
    }

    const nextStat = Number.parseInt(value, 10);

    if (!Number.isFinite(nextStat)) {
      return;
    }

    const normalizedStat = Math.max(
      CHARACTER_POINT_BUY_MIN_STAT,
      Math.min(CHARACTER_POINT_BUY_MAX_STAT, nextStat),
    );
    const nextFormData = {
      ...formData,
      [key]: normalizedStat,
    };
    const nextCost = calculateCharacterPointBuyCost(nextFormData);

    if (nextCost !== null && nextCost > CHARACTER_POINT_BUY_BUDGET) {
      setFeedback({
        tone: "error",
        text: "Not enough point-buy budget for that stat increase.",
      });
      return;
    }

    setFormData(nextFormData);

    if (
      feedback?.tone === "error" &&
      feedback.text === "Not enough point-buy budget for that stat increase."
    ) {
      setFeedback(null);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setFeedback(null);
    setFieldErrors({});

    if (isOverBudget) {
      setFeedback({
        tone: "error",
        text: `You have assigned too many points. Max is ${CHARACTER_POINT_BUY_BUDGET}.`,
      });
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        strength: Number(formData.strength),
        dexterity: Number(formData.dexterity),
        constitution: Number(formData.constitution),
        intelligence: Number(formData.intelligence),
        wisdom: Number(formData.wisdom),
        charisma: Number(formData.charisma),
      };

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

      <div className={styles.classInfoCard}>
        <p className={`${styles.feedback} ${styles.feedbackOk}`}>
          Start bonus: {classStartBonus}
        </p>
        <p className={`${styles.feedback} ${styles.feedbackOk}`}>
          Class passive: <strong>{classPassive.name}</strong> - {classPassive.description}
        </p>
      </div>

      <div className={styles.statGrid}>
        {CHARACTER_STAT_FIELDS.map((field) => (
          <label className={styles.field} key={field.key} htmlFor={field.key}>
            {field.label}
            <input
              className={styles.input}
              id={field.key}
              name={field.key}
              type="number"
              min={CHARACTER_POINT_BUY_MIN_STAT}
              max={CHARACTER_POINT_BUY_MAX_STAT}
              step={1}
              required
              value={formData[field.key]}
              onChange={(event) => updateField(field.key, event.target.value)}
            />
          </label>
        ))}
      </div>

      {CHARACTER_STAT_FIELDS.map((field) =>
        fieldErrors[field.key] ? (
          <p key={field.key} className={`${styles.feedback} ${styles.feedbackError}`}>
            {field.label}: {fieldErrors[field.key][0]}
          </p>
        ) : null,
      )}

      <div className={styles.pointBuyCard}>
        <p className={`${styles.feedback} ${isOverBudget ? styles.feedbackError : styles.feedbackOk}`}>
          Point-buy: {pointBuyCost ?? "-"} / {CHARACTER_POINT_BUY_BUDGET}
          {" | "}
          Remaining: {pointsRemaining ?? "-"}
        </p>
        {fieldErrors.pointBudget ? (
          <p className={`${styles.feedback} ${styles.feedbackError}`}>
            {fieldErrors.pointBudget[0]}
          </p>
        ) : null}
      </div>

      <button className={styles.submitButton} disabled={isLoading || isOverBudget} type="submit">
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
