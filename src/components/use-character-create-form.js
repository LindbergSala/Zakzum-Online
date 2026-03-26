"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  CHARACTER_CLASS_OPTIONS,
  CHARACTER_RACE_OPTIONS,
} from "@/lib/character-data";
import { getAvatarOptionsForRace } from "@/lib/character-avatars";
import { getClassPassive } from "@/lib/class-identity";
import { getRacePassive } from "@/lib/race-identity";

const SWIPE_THRESHOLD_PX = 40;

function buildInitialFormData() {
  const initialRace = CHARACTER_RACE_OPTIONS[0].value;

  return {
    name: "",
    characterRace: initialRace,
    characterClass: CHARACTER_CLASS_OPTIONS[0].value,
    avatarImage: "",
  };
}

function clampAvatarIndex(index, listLength) {
  if (listLength <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, listLength - 1));
}

export function buildAvatarDisplaySrc(path, characterRace, index) {
  if (!path) {
    return "";
  }

  return `${path}?race=${characterRace.toLowerCase()}&slot=${index + 1}`;
}

export function useCharacterCreateForm() {
  const router = useRouter();
  const [formData, setFormData] = useState(buildInitialFormData);
  const [activeAvatarIndex, setActiveAvatarIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const classPassive = getClassPassive(formData.characterClass);
  const racePassive = getRacePassive(formData.characterRace);
  const raceAvatarOptions = useMemo(
    () => getAvatarOptionsForRace(formData.characterRace),
    [formData.characterRace],
  );
  const hasRaceAvatars = raceAvatarOptions.length > 0;

  function updateField(key, value) {
    setFormData((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function selectAvatarByIndex(index) {
    if (!hasRaceAvatars) {
      setActiveAvatarIndex(0);
      updateField("avatarImage", "");
      return;
    }

    const safeIndex = clampAvatarIndex(index, raceAvatarOptions.length);
    const avatarImage = raceAvatarOptions[safeIndex] ?? "";

    setActiveAvatarIndex(safeIndex);
    updateField("avatarImage", avatarImage);
  }

  function goToNextAvatar() {
    if (!hasRaceAvatars) {
      return;
    }

    const nextIndex = (activeAvatarIndex + 1) % raceAvatarOptions.length;
    selectAvatarByIndex(nextIndex);
  }

  function goToPreviousAvatar() {
    if (!hasRaceAvatars) {
      return;
    }

    const previousIndex =
      (activeAvatarIndex - 1 + raceAvatarOptions.length) %
      raceAvatarOptions.length;
    selectAvatarByIndex(previousIndex);
  }

  function handleSwipeStart(event) {
    if (!hasRaceAvatars) {
      return;
    }

    setTouchStartX(event.touches[0]?.clientX ?? null);
  }

  function handleSwipeEnd(event) {
    if (!hasRaceAvatars || touchStartX == null) {
      return;
    }

    const touchEndX = event.changedTouches[0]?.clientX;

    if (typeof touchEndX !== "number") {
      setTouchStartX(null);
      return;
    }

    const swipeDistance = touchEndX - touchStartX;

    if (Math.abs(swipeDistance) >= SWIPE_THRESHOLD_PX) {
      if (swipeDistance < 0) {
        goToNextAvatar();
      } else {
        goToPreviousAvatar();
      }
    }

    setTouchStartX(null);
  }

  useEffect(() => {
    if (!hasRaceAvatars) {
      setActiveAvatarIndex(0);
      setFormData((previous) =>
        previous.avatarImage
          ? {
              ...previous,
              avatarImage: "",
            }
          : previous,
      );
      return;
    }

    const selectedIndex = raceAvatarOptions.indexOf(formData.avatarImage);

    if (selectedIndex >= 0) {
      setActiveAvatarIndex(selectedIndex);
      return;
    }

    setActiveAvatarIndex(0);
    setFormData((previous) => ({
      ...previous,
      avatarImage: raceAvatarOptions[0] ?? "",
    }));
  }, [formData.avatarImage, hasRaceAvatars, raceAvatarOptions]);

  const avatarState = useMemo(() => {
    if (!hasRaceAvatars) {
      return {
        previousAvatarIndex: 0,
        nextAvatarIndex: 0,
        previousAvatarPath: "",
        currentAvatarPath: "",
        nextAvatarPath: "",
      };
    }

    const previousAvatarIndex =
      (activeAvatarIndex - 1 + raceAvatarOptions.length) % raceAvatarOptions.length;
    const nextAvatarIndex = (activeAvatarIndex + 1) % raceAvatarOptions.length;

    return {
      previousAvatarIndex,
      nextAvatarIndex,
      previousAvatarPath: raceAvatarOptions[previousAvatarIndex] ?? "",
      currentAvatarPath: raceAvatarOptions[activeAvatarIndex] ?? "",
      nextAvatarPath: raceAvatarOptions[nextAvatarIndex] ?? "",
    };
  }, [activeAvatarIndex, hasRaceAvatars, raceAvatarOptions]);

  async function onSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setFeedback(null);
    setFieldErrors({});

    const payload = {
      name: formData.name,
      characterRace: formData.characterRace,
      characterClass: formData.characterClass,
      ...(formData.avatarImage
        ? {
            avatarImage: formData.avatarImage,
          }
        : {}),
    };

    try {
      const response = await fetch("/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setFieldErrors(data.errors);
        }
        setFeedback({ tone: "error", text: data.message });
        return;
      }

      setFeedback({ tone: "ok", text: "Character created. Redirecting..." });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setFeedback({
        tone: "error",
        text: "Could not create character. Try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return {
    formData,
    updateField,
    isLoading,
    feedback,
    fieldErrors,
    classPassive,
    racePassive,
    raceAvatarOptions,
    hasRaceAvatars,
    activeAvatarIndex,
    selectAvatarByIndex,
    goToNextAvatar,
    goToPreviousAvatar,
    handleSwipeStart,
    handleSwipeEnd,
    onSubmit,
    ...avatarState,
  };
}
