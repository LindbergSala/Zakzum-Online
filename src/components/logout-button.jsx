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
        setError("Utloggning misslyckades. Forsok igen.");
        return;
      }

      router.push("/login");
      router.refresh();
    } catch {
      setError("Utloggning misslyckades. Forsok igen.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button onClick={onLogout} type="button" disabled={isLoading}>
        {isLoading ? "Loggar ut..." : "Logga ut"}
      </button>
      {error ? <p className="feedback error">{error}</p> : null}
    </>
  );
}

