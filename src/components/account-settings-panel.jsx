"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./account-settings-panel.module.css";

export default function AccountSettingsPanel({ currentEmail, mode = "all" }) {
  const router = useRouter();
  const [nextEmail, setNextEmail] = useState(currentEmail);
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteOverlayOpen, setIsDeleteOverlayOpen] = useState(false);

  const [emailFeedback, setEmailFeedback] = useState(null);
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [deleteFeedback, setDeleteFeedback] = useState(null);
  const showIdentity = mode === "all" || mode === "identity";
  const showSecurity = mode === "all" || mode === "security";
  const showAccount = mode === "all" || mode === "account";

  async function onUpdateEmail(event) {
    event.preventDefault();
    setIsUpdatingEmail(true);
    setEmailFeedback(null);

    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_email",
          nextEmail,
          currentPassword: emailPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setEmailFeedback({ tone: "error", text: data.message ?? "Could not update email." });
        return;
      }

      setEmailFeedback({ tone: "ok", text: data.message ?? "Email updated." });
      setEmailPassword("");
      router.refresh();
    } catch {
      setEmailFeedback({ tone: "error", text: "Could not update email." });
    } finally {
      setIsUpdatingEmail(false);
    }
  }

  async function onUpdatePassword(event) {
    event.preventDefault();
    setIsUpdatingPassword(true);
    setPasswordFeedback(null);

    if (nextPassword !== confirmPassword) {
      setPasswordFeedback({
        tone: "error",
        text: "New password and confirmation do not match.",
      });
      setIsUpdatingPassword(false);
      return;
    }

    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_password",
          currentPassword,
          nextPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setPasswordFeedback({
          tone: "error",
          text: data.message ?? "Could not update password.",
        });
        return;
      }

      setPasswordFeedback({ tone: "ok", text: data.message ?? "Password updated." });
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordFeedback({ tone: "error", text: "Could not update password." });
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  function openDeleteOverlay(event) {
    event.preventDefault();

    if (!deletePassword || isDeletingAccount) {
      return;
    }

    setIsDeleteOverlayOpen(true);
  }

  function closeDeleteOverlay() {
    if (isDeletingAccount) {
      return;
    }

    setIsDeleteOverlayOpen(false);
  }

  async function handleConfirmedAccountDelete() {
    setIsDeletingAccount(true);
    setDeleteFeedback(null);

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: deletePassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setDeleteFeedback({
          tone: "error",
          text: data.message ?? "Account could not be deleted.",
        });
        return;
      }

      setDeleteFeedback({ tone: "ok", text: data.message ?? "Account deleted." });
      setIsDeleteOverlayOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      setDeleteFeedback({
        tone: "error",
        text: "Account could not be deleted.",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  }

  return (
    <>
      <div className={styles.panelGrid}>
      {showIdentity ? (
      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <p className={styles.cardKicker}>Identity</p>
          <h3 className={styles.title}>Change email</h3>
        </header>
        <p className={styles.text}>Current account email: {currentEmail}</p>
        <form className={styles.form} onSubmit={onUpdateEmail}>
          <label className={styles.label} htmlFor="account-next-email">
            New email
            <input
              id="account-next-email"
              className={styles.input}
              type="email"
              autoComplete="email"
              required
              value={nextEmail}
              onChange={(event) => setNextEmail(event.target.value)}
            />
          </label>
          <label className={styles.label} htmlFor="account-email-password">
            Current password
            <input
              id="account-email-password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              minLength={8}
              maxLength={72}
              required
              value={emailPassword}
              onChange={(event) => setEmailPassword(event.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={isUpdatingEmail}
            >
              {isUpdatingEmail ? "Saving..." : "Update email"}
            </button>
          </div>
        </form>
        {emailFeedback ? (
          <p
            className={`${styles.feedback} ${
              emailFeedback.tone === "error" ? styles.feedbackError : styles.feedbackOk
            }`}
          >
            {emailFeedback.text}
          </p>
        ) : null}
      </section>
      ) : null}

      {showSecurity ? (
      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <p className={styles.cardKicker}>Security</p>
          <h3 className={styles.title}>Change password</h3>
        </header>
        <p className={styles.text}>Use your current password to set a new one.</p>
        <form className={styles.form} onSubmit={onUpdatePassword}>
          <label className={styles.label} htmlFor="account-current-password">
            Current password
            <input
              id="account-current-password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              minLength={8}
              maxLength={72}
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>
          <label className={styles.label} htmlFor="account-next-password">
            New password
            <input
              id="account-next-password"
              className={styles.input}
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
            />
          </label>
          <label className={styles.label} htmlFor="account-confirm-password">
            Confirm new password
            <input
              id="account-confirm-password"
              className={styles.input}
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword ? "Saving..." : "Update password"}
            </button>
          </div>
        </form>
        {passwordFeedback ? (
          <p
            className={`${styles.feedback} ${
              passwordFeedback.tone === "error"
                ? styles.feedbackError
                : styles.feedbackOk
            }`}
          >
            {passwordFeedback.text}
          </p>
        ) : null}
      </section>
      ) : null}

      {showAccount ? (
      <section className={`${styles.card} ${styles.cardDanger}`}>
        <header className={styles.cardHeader}>
          <p className={styles.cardKicker}>Critical action</p>
          <h3 className={styles.title}>Danger zone</h3>
        </header>
        <p className={styles.text}>
          Delete your whole account permanently. This removes your character, logs,
          inventory, and account access.
        </p>
        <form className={styles.form} onSubmit={openDeleteOverlay}>
          <label className={styles.label} htmlFor="account-delete-password">
            Confirm account password
            <input
              id="account-delete-password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              minLength={8}
              maxLength={72}
              required
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <button
              className={styles.dangerButton}
              type="submit"
              disabled={isDeletingAccount || deletePassword.length < 8}
            >
              Review account deletion
            </button>
          </div>
        </form>
        {deleteFeedback ? (
          <p
            className={`${styles.feedback} ${
              deleteFeedback.tone === "error" ? styles.feedbackError : styles.feedbackOk
            }`}
          >
            {deleteFeedback.text}
          </p>
        ) : null}
      </section>
      ) : null}
      </div>

      {showAccount && isDeleteOverlayOpen ? (
        <div
          className={styles.overlayRoot}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-confirm-title"
        >
          <div className={styles.overlayBackdrop} onClick={closeDeleteOverlay} />
          <section className={styles.overlayCard}>
            <p className={styles.overlayKicker}>Final confirmation</p>
            <h4 className={styles.overlayTitle} id="delete-account-confirm-title">
              Delete account permanently?
            </h4>
            <p className={styles.overlayText}>
              This removes your account, character, inventory, and all logs forever.
            </p>
            <div className={styles.overlayActions}>
              <button
                className={styles.dangerButton}
                type="button"
                onClick={handleConfirmedAccountDelete}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? "Deleting..." : "Yes, delete account"}
              </button>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={closeDeleteOverlay}
                disabled={isDeletingAccount}
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
