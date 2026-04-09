"use client";

import { useEffect, useMemo, useState } from "react";

import { normalizeInventoryItems } from "./inventory/inventory-logic";
import {
  getInventoryLayoutStorageKey,
  loadStoredInventoryLayout,
  resolvePocketSlots,
} from "./inventory/pocket-layout";
import { getJson } from "@/lib/client-json";

export function useActivityPocketInventory(characterId) {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryLoadError, setInventoryLoadError] = useState("");
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [pocketPlacements, setPocketPlacements] = useState({});

  useEffect(() => {
    if (!characterId) {
      setPocketPlacements({});
      setInventoryItems([]);
      setIsInventoryLoading(false);
      return undefined;
    }

    let isCancelled = false;

    async function loadInventorySnapshot() {
      try {
        setIsInventoryLoading(true);
        const { ok, data } = await getJson("/api/game/inventory");

        if (!ok) {
          throw new Error(data.message ?? "Could not load inventory pockets.");
        }

        if (isCancelled) {
          return;
        }

        setInventoryItems(normalizeInventoryItems(data.items ?? []));
        setInventoryLoadError("");
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setInventoryItems([]);
        setInventoryLoadError(error.message ?? "Could not load inventory pockets.");
      } finally {
        if (!isCancelled) {
          setIsInventoryLoading(false);
        }
      }
    }

    setPocketPlacements(loadStoredInventoryLayout(characterId).pocketPlacements);
    void loadInventorySnapshot();

    function handleStorage(event) {
      if (event.key && event.key !== getInventoryLayoutStorageKey(characterId)) {
        return;
      }

      setPocketPlacements(loadStoredInventoryLayout(characterId).pocketPlacements);
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      isCancelled = true;
      window.removeEventListener("storage", handleStorage);
    };
  }, [characterId]);

  const pocketSlots = useMemo(
    () => resolvePocketSlots({ pocketPlacements, items: inventoryItems }),
    [inventoryItems, pocketPlacements],
  );

  function replaceInventoryItems(items = []) {
    setInventoryItems(normalizeInventoryItems(items));
  }

  return {
    inventoryLoadError,
    isInventoryLoading,
    pocketSlots,
    replaceInventoryItems,
  };
}