"use client";

import { useSyncExternalStore } from "react";

import Inventory from "./inventory-view";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export default function InventoryHydrated(props) {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (!hasHydrated) {
    return null;
  }

  return <Inventory {...props} />;
}
