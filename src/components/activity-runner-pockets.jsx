import Image from "next/image";

import { getItemImagePath } from "@/lib/items/helpers";

export default function ActivityRunnerPockets({
  pocketSlots,
  isBusy,
  isInventoryLoading,
  isPocketActionLoading,
  inventoryLoadError,
  onUsePocket,
}) {
  return (
    <section className="activity-pockets">
      <div className="activity-pockets-header">
        <p className="activity-pockets-kicker">Quick Slots</p>
        <p className="activity-pockets-copy">
          Assigned stackable consumables are available here for fast use before you roll.
        </p>
      </div>
      <div className="activity-pockets-grid">
        {pocketSlots.map((slot) => (
          <article
            className={`activity-pocket-slot ${slot.item ? "activity-pocket-slot-filled" : ""}`}
            key={`activity-pocket-${slot.slotIndex}`}
          >
            <p className="activity-pocket-slot-label">Slot {slot.slotIndex + 1}</p>
            {slot.item ? (
              <>
                <div className="activity-pocket-slot-media">
                  <div className="activity-pocket-slot-artwork-wrap" aria-hidden="true">
                    {getItemImagePath(slot.item.itemId) ? (
                      <Image
                        src={getItemImagePath(slot.item.itemId)}
                        alt=""
                        fill
                        unoptimized
                        sizes="64px"
                        className="activity-pocket-slot-artwork"
                      />
                    ) : (
                      <span className="activity-pocket-slot-artwork-fallback">?</span>
                    )}
                  </div>
                  <div className="activity-pocket-slot-copy-wrap">
                    <p className="activity-pocket-slot-name">{slot.item.itemName}</p>
                    <p className="activity-pocket-slot-meta">Ready x{slot.item.displayQuantity}</p>
                    <p className="activity-pocket-slot-owned">Owned x{slot.item.quantity}</p>
                  </div>
                </div>
                <p className="activity-pocket-slot-effect">{slot.item.effectLabel}</p>
                <button
                  type="button"
                  className="activity-pocket-slot-button"
                  onClick={() => onUsePocket(slot.slotIndex)}
                  disabled={isBusy}
                >
                  {isPocketActionLoading ? "Using..." : "Use 1"}
                </button>
              </>
            ) : (
              <p className="activity-pocket-slot-empty">
                {isInventoryLoading
                  ? "Loading consumables..."
                  : slot.itemKey
                    ? "Assigned consumable is out of stock."
                    : "Assign a stackable consumable in Inventory > Quick Slots."}
              </p>
            )}
          </article>
        ))}
      </div>
      {inventoryLoadError ? (
        <p className="feedback error" aria-live="polite">
          {inventoryLoadError}
        </p>
      ) : null}
    </section>
  );
}