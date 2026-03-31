"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { getItemImagePath, getItemSellValue } from "@/lib/items/helpers";
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

function formatSellValueLabel(sellValue) {
  const parts = [];

  if (Number(sellValue?.gold) > 0) {
    parts.push(`${sellValue.gold} Gold`);
  }

  if (Number(sellValue?.renown) > 0) {
    parts.push(`${sellValue.renown} Renown`);
  }

  return parts.length > 0 ? parts.join(" + ") : "No value";
}

function formatInventoryValueLabel(item) {
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const sellValue = item.sellValue ?? getItemSellValue(item.itemId);
  const perItemLabel = formatSellValueLabel(sellValue);

  if (quantity <= 1 || perItemLabel === "No value") {
    return `Value: ${perItemLabel}`;
  }

  const stackValue = {
    gold: (Number(sellValue?.gold) || 0) * quantity,
    renown: (Number(sellValue?.renown) || 0) * quantity,
  };

  return `Value: ${perItemLabel} each (${formatSellValueLabel(stackValue)} total)`;
}

async function syncInventoryAction(payload) {
  const response = await fetch("/api/game/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Inventory sync failed.");
  }

  return data;
}

async function syncMarketSellAction(payload) {
  const response = await fetch("/api/game/shop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Market sell failed.");
  }

  return data;
}

function ItemCard({ item, draggable, onDragStart, onDragEnd, className, compact = false }) {
  const compactClass = compact ? styles.itemCardCompact : "";
  const nameClass = compact ? styles.itemNameCompact : styles.itemName;
  const imagePath = !compact ? getItemImagePath(item.itemId) : null;
  const statLabel = item.effectLabel || "No stats";
  const valueLabel = formatInventoryValueLabel(item);

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
            </span>
          </span>
        </span>
      ) : null}
    </button>
  );
}

function toInventorySyncPayload(syncAction) {
  if (!syncAction) {
    return null;
  }

  if (typeof syncAction === "string") {
    return {
      action: syncAction,
    };
  }

  if (typeof syncAction !== "object") {
    return null;
  }

  const payload = {
    action: syncAction.type,
  };

  if (syncAction.itemRecordId) {
    payload.itemRecordId = syncAction.itemRecordId;
  }

  if (syncAction.targetItemRecordId) {
    payload.targetItemRecordId = syncAction.targetItemRecordId;
  }

  if (Number.isFinite(syncAction.quantity) && syncAction.quantity > 0) {
    payload.quantity = Math.floor(syncAction.quantity);
  }

  return payload;
}

export default function Inventory({
  characterId,
  items,
  enableSellDropzone = false,
}) {
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
  const [sellPreview, setSellPreview] = useState(false);
  const [dragAnchor, setDragAnchor] = useState({ x: 0, y: 0 });
  const [feedback, setFeedback] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [quantityModal, setQuantityModal] = useState(null);
  const [quantityInput, setQuantityInput] = useState("1");

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
  const consumableStacks = useMemo(
    () => backpackItems.filter((item) => item.stackable),
    [backpackItems],
  );

  useEffect(() => {
    if (!quantityModal) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [quantityModal]);

  useEffect(() => {
    if (!quantityModal) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && !isSyncing) {
        event.preventDefault();
        setQuantityModal(null);
        setQuantityInput("1");
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSyncing, quantityModal]);

  async function syncAfterDrop(syncAction) {
    const payload = toInventorySyncPayload(syncAction);

    if (!payload) {
      return;
    }

    try {
      setIsSyncing(true);
      await syncInventoryAction(payload);
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
    setSellPreview(false);
    setDragAnchor({ x: 0, y: 0 });
  }

  function openQuantityModal(modalConfig) {
    setQuantityModal(modalConfig);
    setQuantityInput(String(modalConfig.defaultQuantity));
    setFeedback("");
  }

  function closeQuantityModal() {
    if (isSyncing) {
      return;
    }

    setQuantityModal(null);
    setQuantityInput("1");
  }

  async function executeSellItem(item, sellQuantity) {
    try {
      setIsSyncing(true);
      const data = await syncMarketSellAction({
        action: "sell",
        itemRecordId: item.id,
        quantity: sellQuantity,
      });
      setFeedback(data.message ?? "Item sold.");
      router.refresh();
    } catch (error) {
      setFeedback(error.message ?? "Market sell failed.");
      router.refresh();
    } finally {
      setIsSyncing(false);
    }
  }

  async function executeUseConsumable(item, useQuantity) {
    try {
      setIsSyncing(true);
      const data = await syncInventoryAction({
        action: "use",
        itemRecordId: item.id,
        quantity: useQuantity,
      });
      setFeedback(data.message ?? `${item.itemName} used.`);
      router.refresh();
    } catch (error) {
      setFeedback(error.message ?? "Could not use consumable.");
      router.refresh();
    } finally {
      setIsSyncing(false);
    }
  }

  async function executeSplitStack(itemKey, splitQuantity) {
    const splitResult = actions.splitStack({
      itemKey,
      splitQuantity,
    });

    if (!splitResult.ok) {
      setFeedback(splitResult.reason ?? "Could not split stack.");
      return;
    }

    await syncAfterDrop(splitResult.syncAction);
  }

  async function handleQuantityModalSubmit(event) {
    event.preventDefault();

    if (!quantityModal || isSyncing) {
      return;
    }

    const item = state.itemsByKey[quantityModal.itemKey];

    if (!item) {
      setFeedback("Item is no longer available.");
      setQuantityModal(null);
      setQuantityInput("1");
      return;
    }

    const parsedQuantity = Number.parseInt(quantityInput, 10);

    if (!Number.isFinite(parsedQuantity)) {
      setFeedback("Enter a valid quantity.");
      return;
    }

    const maxByAction =
      quantityModal.actionType === "split"
        ? Math.max(1, item.quantity - 1)
        : Math.max(1, item.quantity);

    if (parsedQuantity < 1 || parsedQuantity > maxByAction) {
      setFeedback(`Quantity must be between 1 and ${maxByAction}.`);
      return;
    }

    const resolvedQuantity = parsedQuantity;

    setQuantityModal(null);
    setQuantityInput("1");

    if (quantityModal.actionType === "sell") {
      await executeSellItem(item, resolvedQuantity);
      return;
    }

    if (quantityModal.actionType === "use") {
      await executeUseConsumable(item, resolvedQuantity);
      return;
    }

    if (quantityModal.actionType === "split") {
      await executeSplitStack(item.key, resolvedQuantity);
    }
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
    setSellPreview(false);
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
    await syncAfterDrop(result.syncAction);
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
    setSellPreview(false);
  }

  async function handleEquipmentDrop(event, slot) {
    event.preventDefault();

    if (!dragItemKey || isSyncing) {
      return;
    }

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
    await syncAfterDrop(result.syncAction);
  }

  function handleSellDragOver(event) {
    if (!enableSellDropzone) {
      return;
    }

    event.preventDefault();

    if (!dragItemKey || isSyncing) {
      return;
    }

    setSellPreview(true);
    setBackpackPreview(null);
    setEquipmentPreview(null);
  }

  async function handleSellDrop(event) {
    if (!enableSellDropzone) {
      return;
    }

    event.preventDefault();

    if (!dragItemKey || isSyncing) {
      return;
    }

    const dragged = state.itemsByKey[dragItemKey];

    if (!dragged) {
      resetDragState();
      return;
    }

    if (dragged.quantity > 1) {
      openQuantityModal({
        actionType: "sell",
        itemKey: dragged.key,
        title: `Sell ${dragged.itemName}`,
        description: `Choose how many to sell (1-${dragged.quantity}).`,
        confirmLabel: "Sell",
        defaultQuantity: 1,
      });
      resetDragState();
      return;
    }

    resetDragState();
    await executeSellItem(dragged, 1);
  }

  async function handleUseConsumable(itemKey) {
    const item = state.itemsByKey[itemKey];

    if (!item || isSyncing) {
      return;
    }

    if (item.quantity > 1) {
      openQuantityModal({
        actionType: "use",
        itemKey: item.key,
        title: `Use ${item.itemName}`,
        description: `Choose how many to use (1-${item.quantity}).`,
        confirmLabel: "Use",
        defaultQuantity: 1,
      });
      return;
    }

    await executeUseConsumable(item, 1);
  }

  async function handleSplitStack(itemKey) {
    const item = state.itemsByKey[itemKey];

    if (!item || isSyncing || item.quantity <= 1) {
      return;
    }

    const maxSplitQuantity = Math.max(1, item.quantity - 1);
    const suggested = Math.max(1, Math.floor(item.quantity / 2));

    if (maxSplitQuantity === 1) {
      await executeSplitStack(item.key, 1);
      return;
    }

    openQuantityModal({
      actionType: "split",
      itemKey: item.key,
      title: `Split ${item.itemName}`,
      description: `Choose split quantity (1-${maxSplitQuantity}).`,
      confirmLabel: "Split",
      defaultQuantity: suggested,
    });
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

          {consumableStacks.length > 0 ? (
            <section className={styles.consumablePanel}>
              <p className={styles.consumableTitle}>Consumables</p>
              <ul className={styles.consumableList}>
                {consumableStacks.map((item) => (
                  <li className={styles.consumableRow} key={`${item.key}-actions`}>
                    <span className={styles.consumableName}>
                      {item.itemName} x{item.quantity}
                    </span>
                    <div className={styles.consumableActions}>
                      <button
                        className={styles.smallActionButton}
                        type="button"
                        onClick={() => handleUseConsumable(item.key)}
                        disabled={isSyncing}
                      >
                        Use X
                      </button>
                      <button
                        className={styles.smallActionButton}
                        type="button"
                        onClick={() => handleSplitStack(item.key)}
                        disabled={isSyncing || item.quantity <= 1}
                      >
                        Split
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {unplacedItems.length > 0 ? (
            <p className={styles.warningText}>
              Some items could not be placed. Free backpack space and refresh.
            </p>
          ) : null}

          {enableSellDropzone ? (
            <section
              className={`${styles.sellDropzone} ${sellPreview ? styles.sellDropzoneActive : ""}`}
              onDragOver={handleSellDragOver}
              onDrop={handleSellDrop}
            >
              <h4 className={styles.sellDropzoneTitle}>Sell Items</h4>
              <p className={styles.sellDropzoneText}>
                Drag items from inventory and drop them here to sell.
              </p>
            </section>
          ) : null}
        </section>
      </div>

      {isSyncing ? <p className={styles.syncText}>Syncing inventory...</p> : null}
      {feedback ? <p className={styles.feedbackError}>{feedback}</p> : null}

      {quantityModal ? (
        <div
          className={styles.quantityModalRoot}
          role="dialog"
          aria-modal="true"
          aria-labelledby="inventory-quantity-title"
          onClick={closeQuantityModal}
        >
          <div className={styles.quantityModalBackdrop} />
          <section
            className={styles.quantityModalCard}
            onClick={(event) => event.stopPropagation()}
          >
            <p className={styles.quantityModalKicker}>Inventory action</p>
            <h3 className={styles.quantityModalTitle} id="inventory-quantity-title">
              {quantityModal.title}
            </h3>
            <p className={styles.quantityModalText}>{quantityModal.description}</p>
            <form className={styles.quantityModalForm} onSubmit={handleQuantityModalSubmit}>
              <label className={styles.quantityModalLabel} htmlFor="inventory-quantity-input">
                Quantity
              </label>
              <input
                id="inventory-quantity-input"
                className={styles.quantityModalInput}
                type="number"
                min={1}
                max={
                  quantityModal.actionType === "split"
                    ? Math.max(1, (state.itemsByKey[quantityModal.itemKey]?.quantity ?? 1) - 1)
                    : Math.max(1, state.itemsByKey[quantityModal.itemKey]?.quantity ?? 1)
                }
                step={1}
                value={quantityInput}
                onChange={(event) => setQuantityInput(event.target.value)}
                inputMode="numeric"
                autoFocus
              />
              <div className={styles.quantityModalActions}>
                <button type="submit" disabled={isSyncing}>
                  {isSyncing ? "Processing..." : quantityModal.confirmLabel}
                </button>
                <button type="button" onClick={closeQuantityModal} disabled={isSyncing}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
