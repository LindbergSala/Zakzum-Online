"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STAT_ROWS = [
  { key: "strength", label: "STR" },
  { key: "dexterity", label: "DEX" },
  { key: "constitution", label: "CON" },
  { key: "intelligence", label: "INT" },
  { key: "wisdom", label: "WIS" },
  { key: "charisma", label: "CHA" },
];

function StatBreakdown({ summary }) {
  if (!summary) {
    return null;
  }

  return (
    <div>
      <p>
        <strong>Effective stats after equipping</strong>
      </p>
      <ul>
        {STAT_ROWS.map((stat) => (
          <li key={stat.key}>
            {stat.label}: {summary.base[stat.key]} + {summary.bonus[stat.key]} ={" "}
            {summary.effective[stat.key]}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function InventoryActions({ items }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeItemId, setActiveItemId] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [statSummary, setStatSummary] = useState(null);
  const [lastEquipResult, setLastEquipResult] = useState(null);

  async function handleEquip(itemId) {
    setIsLoading(true);
    setActiveItemId(itemId);
    setFeedback(null);
    setLastEquipResult(null);

    try {
      const response = await fetch("/api/game/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({ tone: "error", text: data.message });
        return;
      }

      setStatSummary(data.stats ?? null);
      setFeedback({ tone: "ok", text: data.message });
      setLastEquipResult(data);
      router.refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: "Equip failed. Try again.",
      });
    } finally {
      setIsLoading(false);
      setActiveItemId("");
    }
  }

  if (!items || items.length === 0) {
    return <p>No owned items to equip.</p>;
  }

  return (
    <>
      {isLoading ? (
        <p className="feedback loading" aria-live="polite">
          Applying equipment...
        </p>
      ) : null}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.itemName}</strong> ({item.slot}) - {item.effectLabel}{" "}
            {item.isEquipped ? <em>(equipped)</em> : null}
            <br />
            <button
              type="button"
              onClick={() => handleEquip(item.itemId)}
              disabled={isLoading}
            >
              {isLoading && activeItemId === item.itemId
                ? "Equipping..."
                : `Equip ${item.itemName}`}
            </button>
          </li>
        ))}
      </ul>
      {feedback ? (
        feedback.tone === "error" ? (
          <section className="action-result-card action-result-error" aria-live="polite">
            <p>
              <strong>Equip result:</strong> ERROR
            </p>
            <p>{feedback.text}</p>
          </section>
        ) : (
          <p className={`feedback ${feedback.tone}`} aria-live="polite">
            {feedback.text}
          </p>
        )
      ) : null}
      {lastEquipResult ? (
        <section className="action-result-card action-result-ok" aria-live="polite">
          <p>
            <strong>Equip result:</strong> SUCCESS
          </p>
          <p>
            <strong>Item:</strong> {lastEquipResult.item?.itemName ?? "Unknown item"}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {lastEquipResult.item?.isEquipped ? "Equipped" : "Not equipped"}
          </p>
        </section>
      ) : null}
      <StatBreakdown summary={statSummary} />
    </>
  );
}
