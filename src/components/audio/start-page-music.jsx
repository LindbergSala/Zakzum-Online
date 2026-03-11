"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./start-page-music.module.css";

export default function StartPageMusic({ src }) {
  const audioRef = useRef(null);
  const [enabled, setEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (!enabled) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const playMusic = async () => {
      try {
        await audio.play();
      } catch {}
    };

    playMusic();
  }, [enabled]);

  const toggleMusic = async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (isPlaying) {
      setEnabled(false);
      return;
    }

    setEnabled(true);

    try {
      await audio.play();
    } catch {}
  };

  const isActive = enabled && isPlaying;
  const buttonLabel = isActive ? "Stang av musik" : "Starta musik";

  return (
    <div
      className={styles.wrapper}
      style={{ position: "absolute", top: "1rem", right: "1rem" }}
    >
      <audio ref={audioRef} src={src} loop preload="metadata" />
      <button
        className={`${styles.button} ${isActive ? styles.active : styles.inactive}`}
        type="button"
        onClick={toggleMusic}
        aria-label={buttonLabel}
        title={buttonLabel}
      >
        🎻
      </button>
    </div>
  );
}
