"use client";

import Image from "next/image";

import { buildAvatarDisplaySrc } from "@/components/use-character-create-form";
import styles from "./character-create-form.module.css";

export default function CharacterAvatarSelector({
  characterRace,
  hasRaceAvatars,
  raceAvatarOptions,
  activeAvatarIndex,
  previousAvatarIndex,
  nextAvatarIndex,
  previousAvatarPath,
  currentAvatarPath,
  nextAvatarPath,
  onSwipeStart,
  onSwipeEnd,
  onSelectAvatar,
  onPreviousAvatar,
  onNextAvatar,
}) {
  return (
    <section className={styles.avatarCard}>
      <div className={styles.avatarHeadingRow}>
        <p className={styles.avatarTitle}>Character portrait</p>
        {hasRaceAvatars ? (
          <p className={styles.avatarMeta}>
            {activeAvatarIndex + 1}/{raceAvatarOptions.length}
          </p>
        ) : (
          <p className={styles.avatarMeta}>No portraits available for this race</p>
        )}
      </div>

      {hasRaceAvatars ? (
        <>
          <div
            className={styles.avatarSwipeStage}
            aria-label="Swipe portraits"
            onTouchStart={onSwipeStart}
            onTouchEnd={onSwipeEnd}
          >
            <button
              key={`prev-${previousAvatarPath}`}
              type="button"
              className={`${styles.avatarSwipeCard} ${styles.avatarSwipeSide}`}
              onClick={() => onSelectAvatar(previousAvatarIndex)}
              aria-label="Select previous portrait"
            >
              <Image
                src={buildAvatarDisplaySrc(previousAvatarPath, characterRace, previousAvatarIndex)}
                alt={`${characterRace} previous portrait`}
                width={150}
                height={150}
                className={styles.avatarSwipeImage}
                unoptimized
              />
            </button>

            <button
              key={`current-${currentAvatarPath}`}
              type="button"
              className={`${styles.avatarSwipeCard} ${styles.avatarSwipeCenter}`}
              onClick={() => onSelectAvatar(activeAvatarIndex)}
              aria-label="Current selected portrait"
            >
              <Image
                src={buildAvatarDisplaySrc(currentAvatarPath, characterRace, activeAvatarIndex)}
                alt={`${characterRace} current portrait`}
                width={190}
                height={190}
                className={styles.avatarSwipeImage}
                unoptimized
              />
            </button>

            <button
              key={`next-${nextAvatarPath}`}
              type="button"
              className={`${styles.avatarSwipeCard} ${styles.avatarSwipeSide}`}
              onClick={() => onSelectAvatar(nextAvatarIndex)}
              aria-label="Select next portrait"
            >
              <Image
                src={buildAvatarDisplaySrc(nextAvatarPath, characterRace, nextAvatarIndex)}
                alt={`${characterRace} next portrait`}
                width={150}
                height={150}
                className={styles.avatarSwipeImage}
                unoptimized
              />
            </button>
          </div>

          <div className={styles.avatarControls}>
            <button
              className={styles.avatarControlButton}
              type="button"
              onClick={onPreviousAvatar}
            >
              Previous
            </button>
            <button
              className={styles.avatarControlButton}
              type="button"
              onClick={onNextAvatar}
            >
              Next
            </button>
          </div>

          <div className={styles.avatarRail} aria-label="All portraits">
            {raceAvatarOptions.map((avatarImage, index) => (
              <button
                key={avatarImage}
                type="button"
                className={`${styles.avatarRailItem} ${
                  index === activeAvatarIndex ? styles.avatarRailItemActive : ""
                }`}
                onClick={() => onSelectAvatar(index)}
                aria-label={`Select portrait ${index + 1}`}
                title={`Portrait ${index + 1}`}
              >
                <Image
                  src={buildAvatarDisplaySrc(avatarImage, characterRace, index)}
                  alt={`${characterRace} portrait ${index + 1}`}
                  width={64}
                  height={64}
                  className={styles.avatarRailImage}
                  unoptimized
                />
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className={styles.avatarEmptyText}>
          Portraits for {characterRace.toLowerCase()} are not in the roster yet.
        </p>
      )}
    </section>
  );
}
