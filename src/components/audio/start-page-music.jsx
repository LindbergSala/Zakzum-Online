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
const TRACK_FADE_OUT_MS = 360;
const TRACK_FADE_IN_MS = 460;

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
  const currentTrackRef = useRef(null);
  const trackPositionsRef = useRef(new Map());
  const transitionRef = useRef({
    switchId: 0,
    rafId: null,
    cancelMetadataWait: null,
    inProgress: false,
  });
  const [enabled, setEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_MUSIC_VOLUME);
  const volumeRef = useRef(DEFAULT_MUSIC_VOLUME);
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
      return false;
    }

    try {
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }, []);

  const cancelOngoingTransition = useCallback(() => {
    const transitionState = transitionRef.current;
    transitionState.switchId += 1;

    if (transitionState.rafId !== null) {
      cancelAnimationFrame(transitionState.rafId);
      transitionState.rafId = null;
    }

    if (typeof transitionState.cancelMetadataWait === "function") {
      transitionState.cancelMetadataWait();
      transitionState.cancelMetadataWait = null;
    }

    transitionState.inProgress = false;
  }, []);

  const saveTrackPosition = useCallback((trackSrc) => {
    const audio = audioRef.current;

    if (!audio || typeof trackSrc !== "string" || trackSrc.trim() === "") {
      return;
    }

    const numericTime = Number(audio.currentTime);

    if (!Number.isFinite(numericTime) || numericTime < 0) {
      return;
    }

    trackPositionsRef.current.set(trackSrc, numericTime);
  }, []);

  const restoreTrackPosition = useCallback((trackSrc) => {
    const audio = audioRef.current;

    if (!audio || typeof trackSrc !== "string" || trackSrc.trim() === "") {
      return;
    }

    const savedTime = trackPositionsRef.current.get(trackSrc);

    if (typeof savedTime !== "number" || !Number.isFinite(savedTime) || savedTime < 0) {
      try {
        audio.currentTime = 0;
      } catch {}
      return;
    }

    const duration = Number(audio.duration);
    const maxSafeTime =
      Number.isFinite(duration) && duration > 0 ? Math.max(0, duration - 0.05) : null;
    const nextTime = maxSafeTime === null ? savedTime : Math.min(savedTime, maxSafeTime);

    try {
      audio.currentTime = Math.max(0, nextTime);
    } catch {}
  }, []);

  const fadeAudioVolume = useCallback((from, to, durationMs, switchId) => {
    const audio = audioRef.current;

    if (!audio) {
      return Promise.resolve(false);
    }

    const fromVolume = clampVolume(from);
    const toVolume = clampVolume(to);

    if (durationMs <= 0 || Math.abs(fromVolume - toVolume) < 0.0001) {
      audio.volume = toVolume;
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const startedAt = performance.now();

      const step = (now) => {
        if (transitionRef.current.switchId !== switchId) {
          resolve(false);
          return;
        }

        const progress = Math.min(1, (now - startedAt) / durationMs);
        const nextVolume = fromVolume + (toVolume - fromVolume) * progress;
        audio.volume = clampVolume(nextVolume);

        if (progress >= 1) {
          transitionRef.current.rafId = null;
          resolve(true);
          return;
        }

        transitionRef.current.rafId = requestAnimationFrame(step);
      };

      transitionRef.current.rafId = requestAnimationFrame(step);
    });
  }, []);

  const waitForMetadata = useCallback((switchId) => {
    const audio = audioRef.current;

    if (!audio) {
      return Promise.resolve(false);
    }

    if (audio.readyState >= 1) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      let isSettled = false;

      const cleanup = () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("error", handleError);

        if (transitionRef.current.cancelMetadataWait === cancelWait) {
          transitionRef.current.cancelMetadataWait = null;
        }
      };

      const finalize = (result) => {
        if (isSettled) {
          return;
        }

        isSettled = true;
        cleanup();
        resolve(result && transitionRef.current.switchId === switchId);
      };

      const handleLoadedMetadata = () => finalize(true);
      const handleError = () => finalize(false);
      const cancelWait = () => finalize(false);

      transitionRef.current.cancelMetadataWait = cancelWait;
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("error", handleError);
    });
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
    volumeRef.current = clampVolume(volume);

    const audio = audioRef.current;

    if (!audio || transitionRef.current.inProgress) {
      return;
    }

    audio.volume = volumeRef.current;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    cancelOngoingTransition();
    const switchId = transitionRef.current.switchId;
    transitionRef.current.inProgress = true;

    async function transitionTrack() {
      const currentTrack = currentTrackRef.current;
      const nextTrack = activeSrc;

      if (!enabled) {
        if (currentTrack) {
          saveTrackPosition(currentTrack);
        }

        audio.pause();
        return;
      }

      if (typeof nextTrack !== "string" || nextTrack.trim() === "") {
        return;
      }

      if (currentTrack === nextTrack) {
        audio.volume = volumeRef.current;
        await tryPlay();
        return;
      }

      if (currentTrack) {
        saveTrackPosition(currentTrack);
      }

      if (currentTrack && !audio.paused) {
        const fadedOut = await fadeAudioVolume(
          audio.volume,
          0,
          TRACK_FADE_OUT_MS,
          switchId,
        );

        if (!fadedOut || transitionRef.current.switchId !== switchId) {
          return;
        }
      }

      audio.pause();
      audio.src = nextTrack;
      currentTrackRef.current = nextTrack;
      audio.load();

      const metadataReady = await waitForMetadata(switchId);

      if (!metadataReady || transitionRef.current.switchId !== switchId) {
        return;
      }

      restoreTrackPosition(nextTrack);
      audio.volume = 0;

      const didPlay = await tryPlay();

      if (!didPlay || transitionRef.current.switchId !== switchId) {
        audio.volume = volumeRef.current;
        return;
      }

      await fadeAudioVolume(0, volumeRef.current, TRACK_FADE_IN_MS, switchId);
    }

    void transitionTrack().finally(() => {
      if (transitionRef.current.switchId === switchId) {
        transitionRef.current.inProgress = false;
        transitionRef.current.rafId = null;
      }
    });

    return () => {
      cancelOngoingTransition();
    };
  }, [
    activeSrc,
    enabled,
    tryPlay,
    cancelOngoingTransition,
    saveTrackPosition,
    restoreTrackPosition,
    fadeAudioVolume,
    waitForMetadata,
  ]);

  useEffect(() => {
    return () => {
      const currentTrack = currentTrackRef.current;

      if (currentTrack) {
        saveTrackPosition(currentTrack);
      }

      cancelOngoingTransition();
    };
  }, [cancelOngoingTransition, saveTrackPosition]);

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
      <audio ref={audioRef} loop preload="metadata" />
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
