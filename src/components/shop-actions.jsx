"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function formatResourceLine(resources) {
  if (!resources || typeof resources !== "object") {
    return "No resource data.";
  }

  return [
    `HP ${resources.hp}`,
    `Energy ${resources.energy}`,
    `Gold ${resources.gold}`,
    `XP ${resources.xp}`,
    `Level ${resources.level}`,
    `Renown ${resources.renown}`,
    `Heat ${resources.heat}`,
  ].join(" | ");
}

function formatDelta(delta) {
  if (!delta || typeof delta !== "object") {
    return "No delta.";
  }

  return Object.entries(delta)
    .map(([key, value]) => {
      const numericValue = Number(value);
      const sign = numericValue > 0 ? "+" : "";
      return `${key}: ${sign}${numericValue}`;
    })
    .join(", ");
}

export default function ShopActions({ items }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeItemId, setActiveItemId] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [lastPurchase, setLastPurchase] = useState(null);

  async function handleBuy(itemId) {
    setIsLoading(true);
    setActiveItemId(itemId);
    setFeedback(null);
    setLastPurchase(null);

    try {
      const response = await fetch("/api/game/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({ tone: "error", text: data.message });
        return;
      }

      setFeedback({ tone: "ok", text: data.message });
      setLastPurchase(data);
      router.refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: "Purchase failed. Try again.",
      });
    } finally {
      setIsLoading(false);
      setActiveItemId("");
    }
  }

  if (!items || items.length === 0) {
    return <p>No shop items available.</p>;
  }

  return (
    <>
      {isLoading ? (
        <p className="feedback loading" aria-live="polite">
          Processing purchase...
        </p>
      ) : null}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong> ({item.slot}) - {item.price} Gold -{" "}
            {item.weight} Wt - {item.effectLabel}
            {" "}
            {item.owned ? (
              item.equipped ? (
                <em>(equipped)</em>
              ) : (
                <em>(owned)</em>
              )
            ) : null}
            <br />
            <button
              type="button"
              onClick={() => handleBuy(item.id)}
              disabled={isLoading || item.owned}
            >
              {isLoading && activeItemId === item.id
                ? "Buying..."
                : item.owned
                  ? "Already purchased"
                  : `Buy ${item.name}`}
            </button>
          </li>
        ))}
      </ul>
      {feedback ? (
        feedback.tone === "error" ? (
          <section className="action-result-card action-result-error" aria-live="polite">
            <p>
              <strong>Purchase result:</strong> ERROR
            </p>
            <p>{feedback.text}</p>
          </section>
        ) : (
          <p className={`feedback ${feedback.tone}`} aria-live="polite">
            {feedback.text}
          </p>
        )
      ) : null}
      {lastPurchase ? (
        <section className="action-result-card action-result-ok" aria-live="polite">
          <p>
            <strong>Purchase result:</strong> SUCCESS
          </p>
          <p>
            <strong>Item:</strong> {lastPurchase.item?.itemName ?? "Unknown item"}
          </p>
          <p>
            <strong>Delta:</strong> {formatDelta(lastPurchase.resources?.delta)}
          </p>
          <p>
            <strong>Before:</strong> {formatResourceLine(lastPurchase.resources?.before)}
          </p>
          <p>
            <strong>After:</strong> {formatResourceLine(lastPurchase.resources?.after)}
          </p>
        </section>
      ) : null}
    </>
  );
}
