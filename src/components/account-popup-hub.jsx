"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import AccountSettingsPanel from "@/components/account-settings-panel";
import DeleteCharacterForm from "@/components/delete-character-form";
import styles from "./account-popup-hub.module.css";

const NAV_ITEMS = [
  { id: "security", label: "Security" },
  { id: "identity", label: "Identity" },
  { id: "account", label: "Account" },
  { id: "delete-character", label: "Delete Character" },
  { id: "log", label: "Log" },
  { id: "statistics", label: "Statistics" },
];

const MODAL_TITLE_MAP = {
  security: "Security",
  identity: "Identity",
  account: "Account",
  "delete-character": "Delete Character",
  log: "Log",
  statistics: "Statistics",
};

function getModalIdFromHash(hashValue) {
  if (typeof hashValue !== "string" || !hashValue.startsWith("#")) {
    return "";
  }

  const normalizedHash = hashValue.slice(1).toLowerCase();
  const matchedItem = NAV_ITEMS.find((item) => item.id === normalizedHash);
  return matchedItem?.id ?? "";
}

export default function AccountPopupHub({
  currentEmail,
  hasCharacter,
  logDays = [],
  statisticsCards = [],
  isLogTruncated = false,
  totalLogCount = 0,
  logEntryLimit = 0,
}) {
  const [activeModal, setActiveModal] = useState("");
  const [activeLogIndex, setActiveLogIndex] = useState(0);

  const currentLogDay = logDays[activeLogIndex] ?? null;
  const hasLogData = logDays.length > 0;

  function openModal(modalId) {
    setActiveModal(modalId);

    if (modalId === "log") {
      setActiveLogIndex(0);
    }

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${modalId}`);
    }
  }

  function closeModal() {
    setActiveModal("");

    if (typeof window !== "undefined") {
      const nextUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", nextUrl);
    }
  }

  function showPreviousLogDay() {
    setActiveLogIndex((previous) => Math.min(logDays.length - 1, previous + 1));
  }

  function showNextLogDay() {
    setActiveLogIndex((previous) => Math.max(0, previous - 1));
  }

  useEffect(() => {
    function syncFromHash() {
      const hashModalId = getModalIdFromHash(window.location.hash);

      if (!hashModalId) {
        setActiveModal("");
        return;
      }

      setActiveModal(hashModalId);
      if (hashModalId === "log") {
        setActiveLogIndex(0);
      }
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    return () => {
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, []);

  useEffect(() => {
    if (!activeModal) {
      return undefined;
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeModal]);

  let modalContent = null;

  if (activeModal === "identity") {
    modalContent = <AccountSettingsPanel currentEmail={currentEmail} mode="identity" />;
  } else if (activeModal === "security") {
    modalContent = <AccountSettingsPanel currentEmail={currentEmail} mode="security" />;
  } else if (activeModal === "account") {
    modalContent = <AccountSettingsPanel currentEmail={currentEmail} mode="account" />;
  } else if (activeModal === "delete-character") {
    modalContent = hasCharacter ? (
      <DeleteCharacterForm />
    ) : (
      <p className={styles.emptyStateText}>No active character found on this account.</p>
    );
  } else if (activeModal === "log") {
    modalContent = !hasLogData ? (
      <p className={styles.emptyStateText}>
        No activity logs yet. Run activities to build your history.
      </p>
    ) : (
      <div className={styles.logWrap}>
        <div className={styles.dayNav}>
          <button
            type="button"
            className={styles.dayButton}
            onClick={showPreviousLogDay}
            disabled={activeLogIndex >= logDays.length - 1}
          >
            Previous day
          </button>
          <p className={styles.dayLabel}>{currentLogDay?.label ?? "No day selected"}</p>
          <button
            type="button"
            className={styles.dayButton}
            onClick={showNextLogDay}
            disabled={activeLogIndex <= 0}
          >
            Next day
          </button>
        </div>
        <p className={styles.dayMeta}>
          Day {activeLogIndex + 1} of {logDays.length}
        </p>
        {isLogTruncated ? (
          <p className={styles.dayMeta}>
            Showing latest {logEntryLimit} entries ({totalLogCount} total).
          </p>
        ) : null}
        <ul className={styles.logList}>
          {(currentLogDay?.entries ?? []).map((entry) => (
            <li className={styles.logItem} key={entry.id}>
              <div className={styles.logTopRow}>
                <p className={styles.logTopLine}>
                  <strong>{entry.activityName}</strong>
                </p>
                <p
                  className={`${styles.logStatus} ${
                    entry.isSuccess
                      ? styles.logStatusSuccess
                      : entry.isFail
                        ? styles.logStatusFail
                        : styles.logStatusNeutral
                  }`}
                >
                  {entry.status}
                </p>
              </div>
              <p className={styles.logMetaLine}>{entry.time}</p>
              {entry.rollLine ? <p className={styles.logDetail}>{entry.rollLine}</p> : null}
              {entry.detailLine ? <p className={styles.logDetail}>{entry.detailLine}</p> : null}
              {entry.deltaLine ? <p className={styles.logDetail}>{entry.deltaLine}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    );
  } else if (activeModal === "statistics") {
    modalContent = !statisticsCards.length ? (
      <p className={styles.emptyStateText}>
        No statistics yet. Run activities to generate data.
      </p>
    ) : (
      <ul className={styles.statsGrid}>
        {statisticsCards.map((card, index) => (
          <li className={styles.statCard} key={card.label}>
            <p className={styles.statIndex}>{String(index + 1).padStart(2, "0")}</p>
            <p className={styles.statLabel}>{card.label}</p>
            <p className={styles.statValue}>{card.value}</p>
            <p className={styles.statHint}>{card.hint}</p>
          </li>
        ))}
      </ul>
    );
  }

  const overlayCardSizeClass =
    activeModal === "log" || activeModal === "statistics"
      ? styles.overlayCardWide
      : activeModal === "delete-character"
        ? styles.overlayCardNarrow
        : styles.overlayCardMedium;

  const overlayBodySizeClass =
    activeModal === "log" || activeModal === "statistics"
      ? styles.overlayBodyTall
      : styles.overlayBodyCompact;

  const overlayNode =
    activeModal && typeof document !== "undefined"
      ? createPortal(
          <div
            className={styles.overlayRoot}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-popup-title"
          >
            <div className={styles.overlayBackdrop} onClick={closeModal} />
            <section className={`${styles.overlayCard} ${overlayCardSizeClass}`}>
              <header className={styles.overlayHeader}>
                <p className={styles.overlayKicker}>Account popup</p>
                <h3 className={styles.overlayTitle} id="account-popup-title">
                  {MODAL_TITLE_MAP[activeModal]}
                </h3>
                <button
                  type="button"
                  className={styles.overlayClose}
                  onClick={closeModal}
                  aria-label="Close popup"
                >
                  Close
                </button>
              </header>
              <div className={`${styles.overlayBody} ${overlayBodySizeClass}`}>
                {modalContent}
              </div>
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Account actions">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.navButton} ${
              activeModal === item.id ? styles.navButtonActive : ""
            }`}
            onClick={() => openModal(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <p className={styles.helperText}>
        Choose a section in this account navbar to open it as a popup.
      </p>
      {overlayNode}
    </div>
  );
}
