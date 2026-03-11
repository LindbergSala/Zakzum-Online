"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  calculateCharacterPointBuyCost,
  CHARACTER_CLASS_OPTIONS,
  CHARACTER_POINT_BUY_BUDGET,
  CHARACTER_POINT_BUY_MAX_STAT,
  CHARACTER_POINT_BUY_MIN_STAT,
  CHARACTER_STAT_FIELDS,
} from "@/lib/character-data";
import {
  formatClassStartBonusLabel,
  getClassPassive,
} from "@/lib/class-identity";

const DEFAULT_STAT_VALUE = CHARACTER_POINT_BUY_MIN_STAT;

function buildInitialFormData() {
  const stats = Object.fromEntries(
    CHARACTER_STAT_FIELDS.map((field) => [field.key, DEFAULT_STAT_VALUE]),
  );

  return {
    name: "",
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
  const pointsRemaining =
    pointBuyCost === null ? null : CHARACTER_POINT_BUY_BUDGET - pointBuyCost;
  const isOverBudget = pointsRemaining !== null && pointsRemaining < 0;
  const classStartBonus = formatClassStartBonusLabel(formData.characterClass);
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

    if (isOverBudget) {
      setFeedback({
        tone: "error",
        text: `Du har fordelat for manga poang. Max ar ${CHARACTER_POINT_BUY_BUDGET}.`,
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

      setFeedback({ tone: "ok", text: "Karaktar skapad. Skickar dig vidare..." });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: "Kunde inte skapa karaktar. Forsok igen.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="name">
        Namn
        <input
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
      {fieldErrors.name ? (
        <p className="feedback error">{fieldErrors.name[0]}</p>
      ) : null}

      <label htmlFor="characterClass">
        Klass
        <select
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
      <p className="feedback ok">
        Startbonus: {classStartBonus}
      </p>
      <p className="feedback ok">
        Klasspassiv: <strong>{classPassive.name}</strong> - {classPassive.description}
      </p>
      {fieldErrors.characterClass ? (
        <p className="feedback error">{fieldErrors.characterClass[0]}</p>
      ) : null}

      <div className="stat-grid">
        {CHARACTER_STAT_FIELDS.map((field) => (
          <label key={field.key} htmlFor={field.key}>
            {field.label}
            <input
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
          <p key={field.key} className="feedback error">
            {field.label}: {fieldErrors[field.key][0]}
          </p>
        ) : null,
      )}

      <p className={`feedback ${isOverBudget ? "error" : "ok"}`}>
        Point-buy: {pointBuyCost ?? "-"} / {CHARACTER_POINT_BUY_BUDGET}
        {" | "}
        Kvar: {pointsRemaining ?? "-"}
      </p>
      {fieldErrors.pointBudget ? (
        <p className="feedback error">{fieldErrors.pointBudget[0]}</p>
      ) : null}

      <button disabled={isLoading || isOverBudget} type="submit">
        {isLoading ? "Skapar karaktar..." : "Skapa karaktar"}
      </button>

      {feedback ? (
        <p className={`feedback ${feedback.tone}`}>{feedback.text}</p>
      ) : null}
    </form>
  );
}
