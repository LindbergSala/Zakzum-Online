"use client";

import styles from "./account-settings-panel.module.css";
import { useAccountSettingsPanel } from "./use-account-settings-panel";

export default function AccountSettingsPanel({ currentEmail, mode = "all" }) {
  const {
    nextEmail,
    setNextEmail,
    emailPassword,
    setEmailPassword,
    currentPassword,
    setCurrentPassword,
    nextPassword,
    setNextPassword,
    confirmPassword,
    setConfirmPassword,
    deletePassword,
    setDeletePassword,
    isUpdatingEmail,
    isUpdatingPassword,
    isDeletingAccount,
    isDeleteOverlayOpen,
    emailFeedback,
    passwordFeedback,
    deleteFeedback,
    onUpdateEmail,
    onUpdatePassword,
    openDeleteOverlay,
    closeDeleteOverlay,
    handleConfirmedAccountDelete,
  } = useAccountSettingsPanel(currentEmail);
  const showIdentity = mode === "all" || mode === "identity";
  const showSecurity = mode === "all" || mode === "security";
  const showAccount = mode === "all" || mode === "account";

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
