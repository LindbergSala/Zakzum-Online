"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import styles from "./delete-character-form.module.css";

export default function DeleteCharacterForm() {
  const router = useRouter();
  const overlayCardRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmOverlayOpen, setIsConfirmOverlayOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  function openForm() {
    setFeedback(null);
    setIsExpanded(true);
  }

  function closeForm() {
    if (isLoading) {
      return;
    }

    setPassword("");
    setFeedback(null);
    setIsConfirmOverlayOpen(false);
    setIsExpanded(false);
  }

  function openConfirmOverlay(event) {
    event.preventDefault();

    if (!password || isLoading) {
      return;
    }

    setIsConfirmOverlayOpen(true);
  }

  function closeConfirmOverlay() {
    if (isLoading) {
      return;
    }

    setIsConfirmOverlayOpen(false);
  }

  async function handleConfirmedDelete() {
    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/character", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setFeedback({
          tone: "error",
          text: data.message ?? "Character could not be deleted.",
        });
        return;
      }

      setFeedback({
        tone: "ok",
        text: data.message ?? "Character deleted.",
      });
      setPassword("");
      setIsConfirmOverlayOpen(false);
      setIsExpanded(false);
      router.refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: "Character could not be deleted.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isConfirmOverlayOpen) {
      return undefined;
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusableElements = () => {
      if (!overlayCardRef.current) {
        return [];
      }

      return Array.from(
        overlayCardRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    };

    const focusableElements = getFocusableElements();
    focusableElements[0]?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        if (isLoading) {
          return;
        }

        event.preventDefault();
        setIsConfirmOverlayOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const liveFocusableElements = getFocusableElements();

      if (liveFocusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = liveFocusableElements[0];
      const lastElement = liveFocusableElements[liveFocusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !overlayCardRef.current?.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }

        return;
      }

      if (activeElement === lastElement || !overlayCardRef.current?.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;

      if (previouslyFocusedRef.current instanceof HTMLElement) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [isConfirmOverlayOpen, isLoading]);

  return (
    <>
      <section className={styles.card}>
        <h3 className={styles.title}>Danger zone</h3>
        <p className={styles.text}>
          Delete this character permanently. Account remains, but character, inventory,
          and logs are removed.
        </p>

        {!isExpanded ? (
          <div className={styles.actions}>
            <button
              className={styles.dangerButton}
              onClick={openForm}
              type="button"
            >
              Delete character
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={openConfirmOverlay}>
            <label className={styles.label} htmlFor="delete-character-password">
              Confirm account password
            </label>
            <input
              id="delete-character-password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <div className={styles.actions}>
              <button
                className={styles.dangerButton}
                disabled={isLoading || password.length < 8}
                type="submit"
              >
                Confirm delete
              </button>
              <button
                className={styles.secondaryButton}
                onClick={closeForm}
                type="button"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {feedback ? (
          <p
            className={`${styles.feedback} ${
              feedback.tone === "error" ? styles.feedbackError : styles.feedbackOk
            }`}
          >
            {feedback.text}
          </p>
        ) : null}
      </section>

      {isConfirmOverlayOpen ? (
        <div
          className={styles.overlayRoot}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-character-confirm-title"
        >
          <div className={styles.overlayBackdrop} onClick={closeConfirmOverlay} />
          <section className={styles.overlayCard} ref={overlayCardRef}>
            <h4 className={styles.overlayTitle} id="delete-character-confirm-title">
              Delete character permanently?
            </h4>
            <p className={styles.overlayText}>
              This action cannot be undone.
            </p>
            <div className={styles.overlayActions}>
              <button
                className={styles.dangerButton}
                type="button"
                onClick={handleConfirmedDelete}
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Yes, delete character"}
              </button>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={closeConfirmOverlay}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
