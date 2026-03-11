"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const StartPageMusicContext = createContext(null);

export default function StartPageMusic({ src, children }) {
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
  const contextValue = {
    isActive,
    buttonLabel,
    toggleMusic,
  };

  return (
    <StartPageMusicContext.Provider value={contextValue}>
      {children}
      <audio ref={audioRef} src={src} loop preload="metadata" />
    </StartPageMusicContext.Provider>
  );
}

export function MusicToggleButton({ className }) {
  const music = useContext(StartPageMusicContext);

  if (!music) {
    return null;
  }

  return (
    <button
      className={className}
      type="button"
      onClick={music.toggleMusic}
      aria-label={music.buttonLabel}
      title={music.buttonLabel}
      data-active={music.isActive ? "true" : "false"}
    >
      🎻
    </button>
  );
}
