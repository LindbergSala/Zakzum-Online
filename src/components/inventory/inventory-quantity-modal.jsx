"use client";

import styles from "./inventory-quantity-modal.module.css";

export default function InventoryQuantityModal({
  modal,
  itemQuantity,
  quantityInput,
  onQuantityChange,
  onSubmit,
  onClose,
  isSyncing,
}) {
  if (!modal) {
    return null;
  }

  const maxQuantity =
    modal.actionType === "split"
      ? Math.max(1, (itemQuantity ?? 1) - 1)
      : Math.max(1, itemQuantity ?? 1);
  const actionBadgeLabel =
    modal.actionType === "sell"
      ? "Market trade"
      : modal.actionType === "use"
        ? "Consumable use"
        : modal.actionType === "split"
          ? "Stack management"
          : "Inventory action";
  const actionToneClass =
    modal.actionType === "sell"
      ? styles.quantityModalSellTone
      : modal.actionType === "use"
        ? styles.quantityModalUseTone
        : modal.actionType === "split"
          ? styles.quantityModalSplitTone
          : "";
  const confirmToneClass =
    modal.actionType === "sell"
      ? styles.quantityModalConfirmSell
      : modal.actionType === "use"
        ? styles.quantityModalConfirmUse
        : modal.actionType === "split"
          ? styles.quantityModalConfirmSplit
          : "";

  return (
    <div
      className={styles.quantityModalRoot}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-quantity-title"
      onClick={onClose}
    >
      <div className={styles.quantityModalBackdrop} />
      <section
        className={`${styles.quantityModalCard} ${actionToneClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.quantityModalHeading}>
          <p className={styles.quantityModalKicker}>Inventory action</p>
          <p className={styles.quantityModalBadge}>{actionBadgeLabel}</p>
        </div>
        <h3 className={styles.quantityModalTitle} id="inventory-quantity-title">
          {modal.title}
        </h3>
        <p className={styles.quantityModalText}>{modal.description}</p>
        <form className={styles.quantityModalForm} onSubmit={onSubmit}>
          <label className={styles.quantityModalLabel} htmlFor="inventory-quantity-input">
            Quantity
          </label>
          <div className={styles.quantityModalInputWrap}>
            <input
              id="inventory-quantity-input"
              className={styles.quantityModalInput}
              type="number"
              min={1}
              max={maxQuantity}
              step={1}
              value={quantityInput}
              onChange={(event) => onQuantityChange(event.target.value)}
              inputMode="numeric"
              autoFocus
            />
          </div>
          <p className={styles.quantityModalHint}>Range: 1-{maxQuantity}</p>
          <div className={styles.quantityModalActions}>
            <button
              className={`${styles.quantityModalButton} ${styles.quantityModalConfirm} ${confirmToneClass}`}
              type="submit"
              disabled={isSyncing}
            >
              {isSyncing ? "Processing..." : modal.confirmLabel}
            </button>
            <button
              className={`${styles.quantityModalButton} ${styles.quantityModalCancel}`}
              type="button"
              onClick={onClose}
              disabled={isSyncing}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
