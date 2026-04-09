"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { requestJson } from "@/lib/client-json";

export function useAccountSettingsPanel(currentEmail) {
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

  async function onUpdateEmail(event) {
    event.preventDefault();
    setIsUpdatingEmail(true);
    setEmailFeedback(null);

    try {
      const { ok, data } = await requestJson("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_email",
          nextEmail,
          currentPassword: emailPassword,
        }),
      });

      if (!ok) {
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
      const { ok, data } = await requestJson("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_password",
          currentPassword,
          nextPassword,
        }),
      });

      if (!ok) {
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
      if (data.requiresRelogin) {
        router.push("/login");
        router.refresh();
      }
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
      const { ok, data } = await requestJson("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: deletePassword,
        }),
      });

      if (!ok) {
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

  return {
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
  };
}