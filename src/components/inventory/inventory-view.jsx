"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { getItemImagePath } from "@/lib/items/helpers";
import {
  canDropToBackpack,
  isCompatibleWithEquipmentSlot,
} from "./inventory-logic";
import InventoryItemCard from "./inventory-item-card";
import InventoryQuantityModal from "./inventory-quantity-modal";
import { isPocketConsumableItem } from "./pocket-layout";
import { useInventoryStore } from "./inventory-store";
import styles from "./inventory-shell.module.css";
import {
  clamp,
  formatSlotLabel,
  syncInventoryAction,
  syncMarketSellAction,
  toInventorySyncPayload,
} from "./inventory-utils";

function buildInventoryDecisionSignal({
  unplacedItems,
  consumableStacks,
  pocketSlots,
  enableSellDropzone,
  carrySummary,
}) {
  if (carrySummary?.isOverweight) {
    return {
      title: "Sell before buying anything else",
      text: `You are over the limit by ${Math.abs(carrySummary.remainingWeight)} Wt. Clear weight before trying to expand your loadout.`,
      tone: "warn",
    };
  }

  if (carrySummary && carrySummary.remainingWeight <= 3) {
    return {
      title: "Carry room is almost gone",
      text: `Only ${carrySummary.remainingWeight} Wt remains. Sell or reorganize before the next loot or purchase.`,
      tone: "warn",
    };
  }

  if (unplacedItems.length > 0) {
    return {
      title: "Backpack space is blocking you",
      text: "Free space before you loot, split stacks, or try to reorganize quickly.",
      tone: "warn",
    };
  }

  const emptyPocketCount = pocketSlots.filter((slot) => !slot.item).length;

  if (consumableStacks.length > 0 && emptyPocketCount > 0) {
    return {
      title: "Quick Slots are underused",
      text: "Drag potions and tonics into Quick Slots so they are easier to reach before activities.",
      tone: "ok",
    };
  }

  if (consumableStacks.length === 0) {
    return {
      title: "No consumables are ready",
      text: "Consumables are your fastest preparation tool. Visit a vendor if you want safer runs.",
      tone: "warn",
    };
  }

  if (enableSellDropzone) {
    return {
      title: "Inventory is ready for trading",
      text: "Sell extra weight before buying more. A lighter bag gives you more room for new loot.",
      tone: "ok",
    };
  }

  return {
    title: "Inventory is ready",
    text: "Your loadout is organized enough for the next run.",
    tone: "ok",
  };
}

export default function Inventory({
  characterId,
  items,
  enableSellDropzone = false,
  carrySummary = null,
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
    pocketSlots,
    unplacedItems,
    actions,
  } = useInventoryStore({
    characterId,
    items,
  });
  const [dragItemKey, setDragItemKey] = useState("");
  const [backpackPreview, setBackpackPreview] = useState(null);
  const [equipmentPreview, setEquipmentPreview] = useState(null);
  const [pocketPreview, setPocketPreview] = useState(null);
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
    () => backpackItems.filter((item) => item.kind === "consumable"),
    [backpackItems],
  );
  const inventoryDecisionSignal = buildInventoryDecisionSignal({
    unplacedItems,
    consumableStacks,
    pocketSlots,
    enableSellDropzone,
    carrySummary,
  });

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
    setPocketPreview(null);
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
    setPocketPreview(null);
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
    setPocketPreview(null);
    setSellPreview(false);
  }

  function handlePocketDragOver(event, slotIndex) {
    event.preventDefault();

    if (!draggedItem || isSyncing) {
      return;
    }

    setPocketPreview({
      slotIndex,
      valid: isPocketConsumableItem(draggedItem),
    });
    setBackpackPreview(null);
    setEquipmentPreview(null);
    setSellPreview(false);
  }

  function handlePocketDrop(event, slotIndex) {
    event.preventDefault();

    if (!dragItemKey || isSyncing) {
      return;
    }

    const result = actions.assignPocket({
      itemKey: dragItemKey,
      slotIndex,
    });

    if (!result.ok) {
      setFeedback(result.reason ?? "Could not assign pocket slot.");
      resetDragState();
      return;
    }

    setFeedback("");
    resetDragState();
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
    setPocketPreview(null);
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

    if (item.kind !== "consumable") {
      setFeedback(
        "This item cannot be used. Only consumables (like potions and tonics) can be used.",
      );
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
        {carrySummary ? (
          <p className={styles.carryText}>
            Carry weight: {carrySummary.currentWeight}/{carrySummary.maxWeight} Wt
            {carrySummary.remainingWeight >= 0
              ? ` (${carrySummary.remainingWeight} Wt free)`
              : ` (${Math.abs(carrySummary.remainingWeight)} Wt over)`}
          </p>
        ) : null}
      </header>

      <section
        className={`${styles.decisionSignal} ${
          inventoryDecisionSignal.tone === "warn"
            ? styles.decisionSignalWarn
            : styles.decisionSignalOk
        }`}
        aria-label="Inventory guidance"
      >
        <p className={styles.decisionSignalTitle}>{inventoryDecisionSignal.title}</p>
        <p className={styles.decisionSignalText}>{inventoryDecisionSignal.text}</p>
      </section>

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
                    <InventoryItemCard
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
                <InventoryItemCard
                  item={item}
                  draggable={!isSyncing}
                  onDragStart={(event) => handleDragStart(event, item.key)}
                  onDragEnd={handleDragEnd}
                />
              </div>
            ))}
          </div>

          <section className={styles.pocketsPanel}>
            <div className={styles.pocketsHeader}>
              <p className={styles.pocketsTitle}>Quick Slots</p>
              <p className={styles.pocketsHint}>
                Drag stackable consumables here for quick access during activities.
              </p>
            </div>
            <div className={styles.pocketsGrid}>
              {pocketSlots.map((slot) => {
                const isPreviewed = pocketPreview?.slotIndex === slot.slotIndex;
                const previewClass = isPreviewed
                  ? pocketPreview.valid
                    ? styles.pocketSlotValid
                    : styles.pocketSlotInvalid
                  : "";

                return (
                  <div
                    key={`pocket-slot-${slot.slotIndex}`}
                    className={`${styles.pocketSlot} ${slot.item ? styles.pocketSlotFilled : ""} ${previewClass}`}
                    onDragOver={(event) => handlePocketDragOver(event, slot.slotIndex)}
                    onDrop={(event) => handlePocketDrop(event, slot.slotIndex)}
                  >
                    <p className={styles.pocketSlotLabel}>Slot {slot.slotIndex + 1}</p>
                    {slot.item ? (
                      <>
                        <div className={styles.pocketItemMedia}>
                          <div className={styles.pocketItemArtworkWrap} aria-hidden="true">
                            {getItemImagePath(slot.item.itemId) ? (
                              <Image
                                src={getItemImagePath(slot.item.itemId)}
                                alt=""
                                fill
                                unoptimized
                                sizes="56px"
                                className={styles.pocketItemArtwork}
                              />
                            ) : (
                              <span className={styles.pocketItemArtworkFallback}>?</span>
                            )}
                          </div>
                          <div className={styles.pocketItemInfo}>
                            <p className={styles.pocketItemName}>{slot.item.itemName}</p>
                            <p className={styles.pocketItemMeta}>Ready x{slot.item.displayQuantity}</p>
                            <p className={styles.pocketItemOwned}>Owned x{slot.item.quantity}</p>
                          </div>
                        </div>
                        <button
                          className={styles.pocketClearButton}
                          type="button"
                          onClick={() => actions.clearPocket(slot.slotIndex)}
                          disabled={isSyncing}
                        >
                          Backpack
                        </button>
                      </>
                    ) : (
                      <p className={styles.pocketEmpty}>Drop consumable</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

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

      <InventoryQuantityModal
        modal={quantityModal}
        itemQuantity={quantityModal ? state.itemsByKey[quantityModal.itemKey]?.quantity : 1}
        quantityInput={quantityInput}
        onQuantityChange={setQuantityInput}
        onSubmit={handleQuantityModalSubmit}
        onClose={closeQuantityModal}
        isSyncing={isSyncing}
      />
    </section>
  );
}
