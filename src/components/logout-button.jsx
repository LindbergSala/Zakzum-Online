"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function onLogout() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        setError("Logout failed. Try again.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Logout failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button onClick={onLogout} type="button" disabled={isLoading}>
        {isLoading ? "Logging out..." : "Log out"}
      </button>
      {error ? <p className="feedback error">{error}</p> : null}
    </>
  );
}
