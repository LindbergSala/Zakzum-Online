"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import styles from "./heartlands-location-slideshow.module.css";

const SWIPE_THRESHOLD_PX = 40;

function clampSlideIndex(index, listLength) {
  if (listLength <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, listLength - 1));
}

export default function HeartlandsLocationSlideshow({ slides }) {
  const slideList = useMemo(
    () =>
      Array.isArray(slides)
        ? slides.filter(
            (slide) =>
              slide &&
              typeof slide.src === "string" &&
              slide.src.trim().length > 0 &&
              typeof slide.label === "string" &&
              slide.label.trim().length > 0,
          )
        : [],
    [slides],
  );
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const hasSlides = slideList.length > 0;
  const safeActiveSlideIndex = clampSlideIndex(activeSlideIndex, slideList.length);
  const previousSlideIndex = hasSlides
    ? (safeActiveSlideIndex - 1 + slideList.length) % slideList.length
    : 0;
  const nextSlideIndex = hasSlides
    ? (safeActiveSlideIndex + 1) % slideList.length
    : 0;

  function selectSlideByIndex(index) {
    if (!hasSlides) {
      return;
    }

    setActiveSlideIndex(clampSlideIndex(index, slideList.length));
  }

  function goToPreviousSlide() {
    if (!hasSlides) {
      return;
    }

    selectSlideByIndex(previousSlideIndex);
  }

  function goToNextSlide() {
    if (!hasSlides) {
      return;
    }

    selectSlideByIndex(nextSlideIndex);
  }

  function onSwipeStart(event) {
    if (!hasSlides) {
      return;
    }

    setTouchStartX(event.touches[0]?.clientX ?? null);
  }

  function onSwipeEnd(event) {
    if (!hasSlides || touchStartX == null) {
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
        goToNextSlide();
      } else {
        goToPreviousSlide();
      }
    }

    setTouchStartX(null);
  }

  if (!hasSlides) {
    return null;
  }

  return (
    <section className={styles.galleryCard} aria-label="Heartlands location slideshow">
      <div className={styles.galleryHeadingRow}>
        <p className={styles.galleryTitle}>Heartlands location slideshow</p>
        <p className={styles.galleryMeta}>
          {safeActiveSlideIndex + 1}/{slideList.length}
        </p>
      </div>

      <div className={styles.galleryControls}>
        <button className={styles.galleryControlButton} type="button" onClick={goToPreviousSlide}>
          Previous
        </button>
        <button className={styles.galleryControlButton} type="button" onClick={goToNextSlide}>
          Next
        </button>
      </div>

      <div
        className={styles.gallerySwipeStage}
        aria-label="Swipe locations"
        onTouchStart={onSwipeStart}
        onTouchEnd={onSwipeEnd}
      >
        <button
          key={`prev-${slideList[previousSlideIndex].src}`}
          type="button"
          className={`${styles.gallerySwipeCard} ${styles.gallerySwipeSide}`}
          onClick={() => selectSlideByIndex(previousSlideIndex)}
          aria-label={`Select ${slideList[previousSlideIndex].label}`}
        >
          <Image
            src={slideList[previousSlideIndex].src}
            alt={`${slideList[previousSlideIndex].label} preview`}
            width={210}
            height={315}
            className={styles.gallerySwipeImage}
          />
        </button>

        <button
          key={`current-${slideList[safeActiveSlideIndex].src}`}
          type="button"
          className={`${styles.gallerySwipeCard} ${styles.gallerySwipeCenter}`}
          onClick={() => selectSlideByIndex(safeActiveSlideIndex)}
          aria-label={`Current selected location: ${slideList[safeActiveSlideIndex].label}`}
        >
          <Image
            src={slideList[safeActiveSlideIndex].src}
            alt={slideList[safeActiveSlideIndex].label}
            width={310}
            height={465}
            className={styles.gallerySwipeImage}
            priority={safeActiveSlideIndex === 0}
          />
        </button>

        <button
          key={`next-${slideList[nextSlideIndex].src}`}
          type="button"
          className={`${styles.gallerySwipeCard} ${styles.gallerySwipeSide}`}
          onClick={() => selectSlideByIndex(nextSlideIndex)}
          aria-label={`Select ${slideList[nextSlideIndex].label}`}
        >
          <Image
            src={slideList[nextSlideIndex].src}
            alt={`${slideList[nextSlideIndex].label} preview`}
            width={210}
            height={315}
            className={styles.gallerySwipeImage}
          />
        </button>
      </div>

      <div className={styles.galleryRail} aria-label="All Heartlands locations">
        {slideList.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            className={`${styles.galleryRailItem} ${
              index === safeActiveSlideIndex ? styles.galleryRailItemActive : ""
            }`}
            onClick={() => selectSlideByIndex(index)}
            aria-label={`Select ${slide.label}`}
            title={slide.label}
          >
            <Image
              src={slide.src}
              alt={slide.label}
              width={64}
              height={96}
              className={styles.galleryRailImage}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
