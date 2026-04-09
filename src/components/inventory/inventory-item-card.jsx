"use client";

import Image from "next/image";

import { getItemImagePath, getItemSellValue } from "@/lib/items/helpers";
import { formatTradeValueLabel } from "@/lib/items/trade-format";
import styles from "./inventory-item-card.module.css";

function formatInventoryValueLabel(item) {
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const sellValue = item.sellValue ?? getItemSellValue(item.itemId);
  const perItemLabel = formatTradeValueLabel(sellValue);

  if (quantity <= 1 || perItemLabel === "No value") {
    return `Value: ${perItemLabel}`;
  }

  const stackValue = {
    gold: (Number(sellValue?.gold) || 0) * quantity,
    renown: (Number(sellValue?.renown) || 0) * quantity,
  };

  return `Value: ${perItemLabel} each (${formatTradeValueLabel(stackValue)} total)`;
}

export default function InventoryItemCard({
  item,
  draggable,
  onDragStart,
  onDragEnd,
  className,
  compact = false,
}) {
  const compactClass = compact ? styles.itemCardCompact : "";
  const nameClass = compact ? styles.itemNameCompact : styles.itemName;
  const imagePath = !compact ? getItemImagePath(item.itemId) : null;
  const statLabel = item.effectLabel || "No stats";
  const valueLabel = formatInventoryValueLabel(item);
  const tradeNote = typeof item.tradeNote === "string" ? item.tradeNote : "";

  return (
    <button
      className={`${styles.itemCard} ${compactClass} ${className ?? ""}`}
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={item.itemName}
    >
      {!compact ? (
        <span className={styles.itemInlineArtworkWrap} aria-hidden="true">
          {imagePath ? (
            <Image
              src={imagePath}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 640px) 44px, 64px"
              className={styles.itemInlineArtwork}
            />
          ) : (
            <span className={styles.itemInlineArtworkFallback}>No image</span>
          )}
        </span>
      ) : null}
      <p className={nameClass} title={item.itemName}>
        {item.itemName}
      </p>
      {!compact && item.quantity > 1 ? (
        <span className={styles.stackBadge}>x{item.quantity}</span>
      ) : null}
      {!compact ? (
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
              <span className={styles.itemHoverName}>{item.itemName}</span>
              <span className={styles.itemHoverStatLine}>{statLabel}</span>
              <span className={styles.itemHoverValueLine}>{valueLabel}</span>
              {tradeNote ? (
                <span className={styles.itemHoverTradeNote}>{tradeNote}</span>
              ) : null}
            </span>
          </span>
        </span>
      ) : null}
    </button>
  );
}
