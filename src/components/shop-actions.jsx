"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ShopActions({ items }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeItemId, setActiveItemId] = useState("");
  const [feedback, setFeedback] = useState(null);

  async function handleBuy(itemId) {
    setIsLoading(true);
    setActiveItemId(itemId);
    setFeedback(null);

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
      router.refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: "Kopet misslyckades. Forsok igen.",
      });
    } finally {
      setIsLoading(false);
      setActiveItemId("");
    }
  }

  if (!items || items.length === 0) {
    return <p>Inga butik-items tillgangliga.</p>;
  }

  return (
    <>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong> ({item.slot}) - {item.price} Gold -{" "}
            {item.effectLabel}
            {" "}
            {item.owned ? (
              item.equipped ? (
                <em>(equipped)</em>
              ) : (
                <em>(agd)</em>
              )
            ) : null}
            <br />
            <button
              type="button"
              onClick={() => handleBuy(item.id)}
              disabled={isLoading || item.owned}
            >
              {isLoading && activeItemId === item.id
                ? "Koper..."
                : item.owned
                  ? "Redan koppt"
                  : `Kop ${item.name}`}
            </button>
          </li>
        ))}
      </ul>
      {feedback ? (
        <p className={`feedback ${feedback.tone}`}>{feedback.text}</p>
      ) : null}
    </>
  );
}
