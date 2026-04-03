"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

const StartPageMusicContext = createContext(null);
const MARKET_MUSIC_PATH = "/audio/music/Market.wav";
const HEARTLANDS_MUSIC_PATH = encodeURI("/audio/music/The Heartlands.wav");
const DEFAULT_MUSIC_VOLUME = 0.62;

function clampVolume(value) {
  return Math.min(1, Math.max(0, value));
}

function resolveTrackByPathname(pathname, fallbackSrc) {
  if (typeof pathname === "string" && pathname.startsWith("/market")) {
    return MARKET_MUSIC_PATH;
  }

  if (typeof pathname === "string" && pathname.startsWith("/activities")) {
    return HEARTLANDS_MUSIC_PATH;
  }

  return fallbackSrc;
}

export default function StartPageMusic({ src, children }) {
  const pathname = usePathname();
  const audioRef = useRef(null);
  const [enabled, setEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_MUSIC_VOLUME);
  const [trackOverride, setTrackOverride] = useState(null);
  const routeTrack = resolveTrackByPathname(pathname, src);
  const activeSrc = trackOverride ?? routeTrack;

  const setMusicTrackOverride = useCallback((nextSrc) => {
    if (typeof nextSrc !== "string" || nextSrc.trim() === "") {
      setTrackOverride(null);
      return;
    }

    setTrackOverride(nextSrc);
  }, []);

  const clearMusicTrackOverride = useCallback(() => {
    setTrackOverride(null);
  }, []);

  const setMusicVolume = useCallback((nextVolume) => {
    const numericVolume = Number(nextVolume);
    if (!Number.isFinite(numericVolume)) {
      return;
    }

    setVolume(clampVolume(numericVolume));
  }, []);

  const setMusicVolumePercent = useCallback(
    (nextPercent) => {
      const numericPercent = Number(nextPercent);
      if (!Number.isFinite(numericPercent)) {
        return;
      }

      setMusicVolume(clampVolume(numericPercent / 100));
    },
    [setMusicVolume],
  );

  const tryPlay = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    try {
      await audio.play();
    } catch {}
  }, []);

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

    tryPlay();
  }, [enabled, tryPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = clampVolume(volume);
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !enabled) {
      return;
    }

    audio.currentTime = 0;
    tryPlay();
  }, [activeSrc, enabled, tryPlay]);

  useEffect(() => {
    if (!enabled || isPlaying) {
      return;
    }

    const unlockPlayback = () => {
      tryPlay();
    };

    window.addEventListener("pointerdown", unlockPlayback);
    window.addEventListener("keydown", unlockPlayback);

    return () => {
      window.removeEventListener("pointerdown", unlockPlayback);
      window.removeEventListener("keydown", unlockPlayback);
    };
  }, [enabled, isPlaying, tryPlay]);

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
    tryPlay();
  };

  const isActive = enabled && isPlaying;
  const buttonLabel = isActive ? "Stang av musik" : "Starta musik";
  const volumePercent = Math.round(clampVolume(volume) * 100);
  const contextValue = {
    isActive,
    buttonLabel,
    volume,
    volumePercent,
    toggleMusic,
    setVolume: setMusicVolume,
    setVolumePercent: setMusicVolumePercent,
    setTrackOverride: setMusicTrackOverride,
    clearTrackOverride: clearMusicTrackOverride,
  };

  return (
    <StartPageMusicContext.Provider value={contextValue}>
      {children}
      <audio ref={audioRef} src={activeSrc} loop preload="metadata" />
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

export function MusicVolumeControl({
  className,
  labelClassName,
  inputClassName,
}) {
  const music = useContext(StartPageMusicContext);

  if (!music) {
    return null;
  }

  return (
    <div className={className}>
      <span className={labelClassName} aria-hidden="true">
        Vol
      </span>
      <input
        className={inputClassName}
        type="range"
        min="0"
        max="100"
        step="1"
        value={music.volumePercent}
        onChange={(event) => music.setVolumePercent(event.target.value)}
        aria-label={`Musikvolym ${music.volumePercent}%`}
        title={`Musikvolym ${music.volumePercent}%`}
      />
    </div>
  );
}

export function useStartPageMusic() {
  return useContext(StartPageMusicContext);
}
