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
        className={styles.quantityModalCard}
        onClick={(event) => event.stopPropagation()}
      >
        <p className={styles.quantityModalKicker}>Inventory action</p>
        <h3 className={styles.quantityModalTitle} id="inventory-quantity-title">
          {modal.title}
        </h3>
        <p className={styles.quantityModalText}>{modal.description}</p>
        <form className={styles.quantityModalForm} onSubmit={onSubmit}>
          <label className={styles.quantityModalLabel} htmlFor="inventory-quantity-input">
            Quantity
          </label>
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
          <div className={styles.quantityModalActions}>
            <button type="submit" disabled={isSyncing}>
              {isSyncing ? "Processing..." : modal.confirmLabel}
            </button>
            <button type="button" onClick={onClose} disabled={isSyncing}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
