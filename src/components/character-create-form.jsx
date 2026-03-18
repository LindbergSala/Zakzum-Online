"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CHARACTER_CLASS_OPTIONS,
  CHARACTER_RACE_OPTIONS,
} from "@/lib/character-data";
import { getClassPassive } from "@/lib/class-identity";
import styles from "./character-create-form.module.css";

function buildInitialFormData() {
  return {
    name: "",
    characterRace: CHARACTER_RACE_OPTIONS[0].value,
    characterClass: CHARACTER_CLASS_OPTIONS[0].value,
  };
}

export default function CharacterCreateForm() {
  const router = useRouter();
  const [formData, setFormData] = useState(buildInitialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const classPassive = getClassPassive(formData.characterClass);

  function updateField(key, value) {
    setFormData((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setFeedback(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
          Starting stats: STR 1, DEX 1, CON 1, INT 1, WIS 1, CHA 1.
        </p>
        <p className={`${styles.feedback} ${styles.feedbackOk}`}>
          On each level-up, you gain +1 unspent stat point to assign.
        </p>
        <p className={`${styles.feedback} ${styles.feedbackOk}`}>
          Class passive: <strong>{classPassive.name}</strong> - {classPassive.description}
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
