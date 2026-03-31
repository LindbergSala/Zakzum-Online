"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getItemImagePath } from "@/lib/items/helpers";
import styles from "./shop-actions.module.css";

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

function formatBuyPrice(item) {
  const parts = [];

  if (Number(item.price) > 0) {
    parts.push(`${item.price} Gold`);
  }

  if (Number(item.renownPrice) > 0) {
    parts.push(`${item.renownPrice} Renown`);
  }

  return parts.length > 0 ? parts.join(" + ") : "Free";
}

function formatSellPrice(sellValue) {
  const parts = [];

  if (Number(sellValue?.gold) > 0) {
    parts.push(`${sellValue.gold} Gold`);
  }

  if (Number(sellValue?.renown) > 0) {
    parts.push(`${sellValue.renown} Renown`);
  }

  return parts.length > 0 ? parts.join(" + ") : "No value";
}

export default function ShopActions({ items, marketId = null }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeActionKey, setActiveActionKey] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [lastTransaction, setLastTransaction] = useState(null);

  async function handleBuy(itemId, itemMarketId = null) {
    const actionKey = `buy:${itemId}`;
    const resolvedMarketId = marketId ?? itemMarketId ?? null;

    if (!resolvedMarketId) {
      setFeedback({
        tone: "error",
        text: "No vendor selected for this purchase.",
      });
      return;
    }

    setIsLoading(true);
    setActiveActionKey(actionKey);
    setFeedback(null);
    setLastTransaction(null);

    try {
      const response = await fetch("/api/game/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action: "buy", marketId: resolvedMarketId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({ tone: "error", text: data.message });
        return;
      }

      setFeedback({ tone: "ok", text: data.message });
      setLastTransaction(data);
      router.refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: "Market purchase failed. Try again.",
      });
    } finally {
      setIsLoading(false);
      setActiveActionKey("");
    }
  }

  return (
    <>
      {isLoading ? (
        <p className="feedback loading" aria-live="polite">
          Processing market transaction...
        </p>
      ) : null}

      {feedback ? (
        feedback.tone === "error" ? (
          <section
            className={`action-result-card action-result-error ${styles.topFeedback}`}
            aria-live="polite"
          >
            <p>{feedback.text}</p>
          </section>
        ) : (
          <p className={`feedback ${feedback.tone} ${styles.topFeedback}`} aria-live="polite">
            {feedback.text}
          </p>
        )
      ) : null}

      {lastTransaction ? (
        <section
          className={`action-result-card action-result-ok ${styles.topFeedback}`}
          aria-live="polite"
        >
          <p>
            <strong>Item:</strong> {lastTransaction.item?.itemName ?? "Unknown item"}
          </p>
          <p>
            <strong>Delta:</strong> {formatDelta(lastTransaction.resources?.delta)}
          </p>
          <p>
            <strong>Before:</strong> {formatResourceLine(lastTransaction.resources?.before)}
          </p>
          <p>
            <strong>After:</strong> {formatResourceLine(lastTransaction.resources?.after)}
          </p>
        </section>
      ) : null}

      <div>
        <h4>Buy from this vendor</h4>
        {!items || items.length === 0 ? (
          <p>No market items available.</p>
        ) : (
          <ul>
            {items.map((item) => {
              const stackInfo = item.isStackable
                ? `Stackable (max ${item.maxStack ?? 5})`
                : "Unique equipment";
              const imagePath = getItemImagePath(item.id);
              const overlayTradeLine = `Buy: ${formatBuyPrice(item)} | Sell: ${formatSellPrice(item.sellValue)}`;

              return (
                <li key={item.id} className={styles.marketItemRow}>
                  <div className={styles.itemVisualWrap}>
                    <div className={styles.itemVisualFrame} aria-hidden="true">
                      {imagePath ? (
                        <Image
                          src={imagePath}
                          alt=""
                          width={88}
                          height={88}
                          className={styles.itemVisual}
                        />
                      ) : (
                        <span className={styles.itemVisualFallback}>No image</span>
                      )}
                    </div>
                    <span className={styles.itemHoverOverlay} aria-hidden="true">
                      <span className={styles.itemHoverCard}>
                        <span className={styles.itemHoverImageWrap}>
                          {imagePath ? (
                            <Image
                              src={imagePath}
                              alt=""
                              width={320}
                              height={320}
                              className={styles.itemHoverImage}
                            />
                          ) : (
                            <span className={styles.itemHoverImageFallback}>No image</span>
                          )}
                        </span>
                        <span className={styles.itemHoverInfo}>
                          <span className={styles.itemHoverName}>{item.name}</span>
                          <span className={styles.itemHoverStatLine}>
                            {item.effectLabel || "No stats"}
                          </span>
                          <span className={styles.itemHoverValueLine}>{overlayTradeLine}</span>
                        </span>
                      </span>
                    </span>
                  </div>
                  <div className={styles.itemInfo}>
                    <p>
                      <strong>{item.name}</strong>
                      {Number(item.ownedQuantity) > 0 ? ` (owned x${item.ownedQuantity})` : ""}
                    </p>
                    {item.description ? <p>{item.description}</p> : null}
                    <p>
                      Slot: {item.slot} | Buy: {formatBuyPrice(item)} | Sell: {" "}
                      {formatSellPrice(item.sellValue)} | Weight: {item.weight} Wt
                    </p>
                    <p>{stackInfo}</p>
                    <p>Effects: {item.effectLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuy(item.id, item.marketId)}
                    disabled={isLoading || (!item.isStackable && item.owned)}
                  >
                    {isLoading && activeActionKey === `buy:${item.id}`
                      ? "Buying..."
                      : !item.isStackable && item.owned
                        ? "Already purchased"
                        : `Buy ${item.name}`}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div style={{ marginTop: "0.9rem" }}>
        <h4>Sell from inventory</h4>
        <p>
          Drag any owned item into the <strong>Sell Items</strong> box in the inventory panel.
          For stackables, you can choose partial quantity at drop.
        </p>
      </div>
    </>
  );
}
