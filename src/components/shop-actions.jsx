"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getItemImagePath } from "@/lib/items/helpers";
import { formatBuyValueLabel, formatTradeValueLabel } from "@/lib/items/trade-format";
import { requestJson } from "@/lib/client-json";
import styles from "./shop-actions.module.css";

function buildPurchaseSignal(item, currentGold, remainingWeight) {
  const buyPrice = Number(item.price) || 0;
  const itemWeight = Number(item.weight) || 0;

  if (!item.isStackable && item.owned) {
    return {
      tone: "neutral",
      text: "Already owned",
    };
  }

  if (currentGold < buyPrice) {
    return {
      tone: "warn",
      text: `Need ${buyPrice - currentGold} more Gold`,
    };
  }

  if (Number.isFinite(remainingWeight) && itemWeight > remainingWeight) {
    return {
      tone: "warn",
      text: `Clear ${itemWeight - remainingWeight} Wt first`,
    };
  }

  return {
    tone: "ok",
    text: item.isStackable ? "Affordable refill" : "Affordable and fits",
  };
}

export default function ShopActions({
  items,
  marketId = null,
  currentGold = 0,
  remainingWeight = null,
  recommendedItemId = "",
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeActionKey, setActiveActionKey] = useState("");
  const [feedback, setFeedback] = useState(null);

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

    try {
       const { ok, data } = await requestJson("/api/game/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action: "buy", marketId: resolvedMarketId }),
      });


       if (!ok) {
        setFeedback({ tone: "error", text: data.message });
        return;
      }

      setFeedback({ tone: "ok", text: data.message });
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
              const overlayTradeLine = `Buy: ${formatBuyValueLabel(item)} | Sell: ${formatTradeValueLabel(item.sellValue)}`;
              const purchaseSignal = buildPurchaseSignal(item, currentGold, remainingWeight);
              const isRecommended = recommendedItemId === item.id;

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
                          unoptimized
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
                              unoptimized
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
                    {isRecommended ? (
                      <p className={styles.recommendedBuy}>Recommended next buy</p>
                    ) : null}
                    <p
                      className={`${styles.purchaseSignal} ${
                        purchaseSignal.tone === "warn"
                          ? styles.purchaseSignalWarn
                          : purchaseSignal.tone === "ok"
                            ? styles.purchaseSignalOk
                            : styles.purchaseSignalNeutral
                      }`}
                    >
                      {purchaseSignal.text}
                    </p>
                    {item.description ? <p>{item.description}</p> : null}
                    <p>
                      Slot: {item.slot} | Buy: {formatBuyValueLabel(item)} | Sell: {" "}
                      {formatTradeValueLabel(item.sellValue)} | Weight: {item.weight} Wt
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
