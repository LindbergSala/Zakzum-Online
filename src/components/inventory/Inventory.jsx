"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import {
  canDropToBackpack,
  isCompatibleWithEquipmentSlot,
} from "./inventoryLogic";
import { useInventoryStore } from "./inventoryStore";
import styles from "./Inventory.module.css";

function formatSlotLabel(slot) {
  if (!slot) {
    return "Unknown";
  }

  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

async function syncEquipmentAction(itemId, action) {
  const response = await fetch("/api/game/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, action }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Inventory sync failed.");
  }

  return data;
}

function ItemCard({ item, draggable, onDragStart, onDragEnd, className, compact = false }) {
  const compactClass = compact ? styles.itemCardCompact : "";
  const nameClass = compact ? styles.itemNameCompact : styles.itemName;
  const metaClass = compact ? styles.itemMetaCompact : styles.itemMeta;

  return (
    <button
      className={`${styles.itemCard} ${compactClass} ${className ?? ""}`}
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={`${item.itemName} (${item.width}x${item.height})`}
    >
      <p className={nameClass}>{item.itemName}</p>
      {!compact ? (
        <>
          <p className={metaClass}>{item.effectLabel}</p>
          <p className={metaClass}>
            {item.width}x{item.height} | {item.weight} Wt
          </p>
        </>
      ) : (
        <p className={metaClass}>
          {item.width}x{item.height}
          {item.quantity > 1 ? ` | x${item.quantity}` : ""}
        </p>
      )}
      {!compact && item.quantity > 1 ? (
        <span className={styles.stackBadge}>x{item.quantity}</span>
      ) : null}
    </button>
  );
}

export default function Inventory({ characterId, items }) {
  const router = useRouter();
  const backpackGridRef = useRef(null);
  const {
    state,
    columns,
    rows,
    equipmentSlots,
    backpackItems,
    equipmentBySlot,
    unplacedItems,
    actions,
  } = useInventoryStore({
    characterId,
    items,
  });
  const [dragItemKey, setDragItemKey] = useState("");
  const [backpackPreview, setBackpackPreview] = useState(null);
  const [equipmentPreview, setEquipmentPreview] = useState(null);
  const [dragAnchor, setDragAnchor] = useState({ x: 0, y: 0 });
  const [feedback, setFeedback] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const cells = useMemo(
    () =>
      Array.from({ length: rows * columns }, (_, index) => {
        const x = index % columns;
        const y = Math.floor(index / columns);
        return { x, y, key: `${x}-${y}` };
      }),
    [columns, rows],
  );

  const draggedItem = dragItemKey ? state.itemsByKey[dragItemKey] : null;

  async function syncAfterDrop(itemId, action) {
    if (!action) {
      return;
    }

    try {
      setIsSyncing(true);
      await syncEquipmentAction(itemId, action);
      setFeedback("");
      router.refresh();
    } catch (error) {
      setFeedback(error.message ?? "Inventory sync failed.");
      router.refresh();
    } finally {
      setIsSyncing(false);
    }
  }

  function resetDragState() {
    setDragItemKey("");
    setBackpackPreview(null);
    setEquipmentPreview(null);
    setDragAnchor({ x: 0, y: 0 });
  }

  function getBackpackDropTarget(event, item) {
    if (!backpackGridRef.current || !item) {
      return null;
    }

    const gridElement = backpackGridRef.current;
    const rect = gridElement.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    const gridStyles = window.getComputedStyle(gridElement);
    const columnGap = Number.parseFloat(gridStyles.columnGap) || 0;
    const rowGap = Number.parseFloat(gridStyles.rowGap) || columnGap;
    const cellWidth = (rect.width - columnGap * (columns - 1)) / columns;
    const cellHeight = (rect.height - rowGap * (rows - 1)) / rows;

    if (cellWidth <= 0 || cellHeight <= 0) {
      return null;
    }

    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;
    const cursorColumn = clamp(
      Math.floor(relativeX / (cellWidth + columnGap)),
      0,
      columns - 1,
    );
    const cursorRow = clamp(
      Math.floor(relativeY / (cellHeight + rowGap)),
      0,
      rows - 1,
    );
    const maxX = Math.max(0, columns - item.width);
    const maxY = Math.max(0, rows - item.height);

    return {
      x: clamp(cursorColumn - dragAnchor.x, 0, maxX),
      y: clamp(cursorRow - dragAnchor.y, 0, maxY),
    };
  }

  function handleDragStart(event, itemKey) {
    if (isSyncing) {
      return;
    }

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", itemKey);
    }

    const item = state.itemsByKey[itemKey];
    const placement = state.placements[itemKey];
    const targetElement = event.currentTarget;

    if (!item || !targetElement || placement?.zone !== "backpack") {
      setDragAnchor({ x: 0, y: 0 });
    } else {
      const rect = targetElement.getBoundingClientRect();
      const safeWidth = Math.max(1, rect.width);
      const safeHeight = Math.max(1, rect.height);
      const relativeX = clamp(event.clientX - rect.left, 0, safeWidth);
      const relativeY = clamp(event.clientY - rect.top, 0, safeHeight);
      const anchorX = clamp(
        Math.floor((relativeX / safeWidth) * item.width),
        0,
        item.width - 1,
      );
      const anchorY = clamp(
        Math.floor((relativeY / safeHeight) * item.height),
        0,
        item.height - 1,
      );
      setDragAnchor({ x: anchorX, y: anchorY });
    }

    setDragItemKey(itemKey);
    setFeedback("");
  }

  function handleDragEnd() {
    resetDragState();
  }

  function handleBackpackDragOver(event) {
    event.preventDefault();

    if (!dragItemKey || isSyncing || !draggedItem) {
      return;
    }

    const targetPosition = getBackpackDropTarget(event, draggedItem);

    if (!targetPosition) {
      return;
    }

    const placementCheck = canDropToBackpack({
      state,
      itemKey: dragItemKey,
      targetX: targetPosition.x,
      targetY: targetPosition.y,
      columns,
      rows,
    });

    setBackpackPreview({
      x: targetPosition.x,
      y: targetPosition.y,
      width: draggedItem.width,
      height: draggedItem.height,
      valid: placementCheck.ok,
    });
    setEquipmentPreview(null);
  }

  async function handleBackpackDrop(event) {
    event.preventDefault();

    if (!dragItemKey || isSyncing) {
      return;
    }

    const draggedItemBeforeMove = state.itemsByKey[dragItemKey];
    const targetPosition = getBackpackDropTarget(event, draggedItemBeforeMove);

    if (!targetPosition) {
      setFeedback("Invalid placement.");
      resetDragState();
      return;
    }

    const result = actions.moveBackpack({
      itemKey: dragItemKey,
      targetX: targetPosition.x,
      targetY: targetPosition.y,
    });

    if (!result.ok) {
      setFeedback(result.reason ?? "Invalid placement.");
      resetDragState();
      return;
    }

    resetDragState();
    await syncAfterDrop(draggedItemBeforeMove?.itemId, result.syncAction);
  }

  function handleEquipmentDragOver(event, slot) {
    event.preventDefault();

    if (!draggedItem || isSyncing) {
      return;
    }

    setEquipmentPreview({
      slot,
      valid: isCompatibleWithEquipmentSlot(draggedItem, slot),
    });
    setBackpackPreview(null);
  }

  async function handleEquipmentDrop(event, slot) {
    event.preventDefault();

    if (!dragItemKey || isSyncing) {
      return;
    }

    const draggedItemBeforeMove = state.itemsByKey[dragItemKey];
    const result = actions.moveEquipment({
      itemKey: dragItemKey,
      slot,
    });

    if (!result.ok) {
      setFeedback(result.reason ?? "Invalid equipment slot.");
      resetDragState();
      return;
    }

    resetDragState();
    await syncAfterDrop(draggedItemBeforeMove?.itemId, result.syncAction);
  }

  return (
    <section className={styles.inventoryRoot}>
      <header className={styles.header}>
        <h2>Inventory</h2>
        <p>Drag items between backpack grid and equipment slots.</p>
      </header>

      <div className={styles.layout}>
        <section className={styles.equipmentPanel}>
          <h3>Equipment slots</h3>
          <div className={styles.equipmentGrid}>
            {equipmentSlots.map((slot) => {
              const item = equipmentBySlot[slot];
              const isHovered = equipmentPreview?.slot === slot;
              const hoverClass = isHovered
                ? equipmentPreview.valid
                  ? styles.slotValid
                  : styles.slotInvalid
                : "";

              return (
                <div
                  className={`${styles.equipmentSlot} ${hoverClass}`}
                  key={slot}
                  onDragOver={(event) => handleEquipmentDragOver(event, slot)}
                  onDrop={(event) => handleEquipmentDrop(event, slot)}
                >
                  <p className={styles.slotLabel}>{formatSlotLabel(slot)}</p>
                  {item ? (
                    <ItemCard
                      item={item}
                      compact
                      draggable={!isSyncing}
                      onDragStart={(event) => handleDragStart(event, item.key)}
                      onDragEnd={handleDragEnd}
                    />
                  ) : (
                    <p className={styles.emptySlot}>Empty</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.backpackPanel}>
          <h3>Backpack</h3>
          <div
            ref={backpackGridRef}
            className={styles.backpackGrid}
            onDragOver={handleBackpackDragOver}
            onDrop={handleBackpackDrop}
          >
            {cells.map((cell) => (
              <div
                key={cell.key}
                className={styles.backpackCell}
                onDragOver={handleBackpackDragOver}
                onDrop={handleBackpackDrop}
              />
            ))}

            {backpackPreview ? (
              <div
                className={`${styles.dropPreview} ${
                  backpackPreview.valid ? styles.previewValid : styles.previewInvalid
                }`}
                style={{
                  gridColumn: `${backpackPreview.x + 1} / span ${backpackPreview.width}`,
                  gridRow: `${backpackPreview.y + 1} / span ${backpackPreview.height}`,
                }}
              />
            ) : null}

            {backpackItems.map((item) => (
              <div
                key={item.key}
                className={styles.backpackItemWrap}
                style={{
                  gridColumn: `${item.placement.x + 1} / span ${item.width}`,
                  gridRow: `${item.placement.y + 1} / span ${item.height}`,
                }}
              >
                <ItemCard
                  item={item}
                  draggable={!isSyncing}
                  onDragStart={(event) => handleDragStart(event, item.key)}
                  onDragEnd={handleDragEnd}
                />
              </div>
            ))}
          </div>

          {unplacedItems.length > 0 ? (
            <p className={styles.warningText}>
              Some items could not be placed. Free backpack space and refresh.
            </p>
          ) : null}
        </section>
      </div>

      {isSyncing ? <p className={styles.syncText}>Syncing inventory...</p> : null}
      {feedback ? <p className={styles.feedbackError}>{feedback}</p> : null}
    </section>
  );
}
