'use client';

import { useEffect, useRef, useState } from 'react';

const DB_NAME = 'ipc_audio_db';
const AUDIO_STORE = 'audio';

async function getAudioFromIDB(audioId: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          resolve(null);
          return;
        }
        const tx = db.transaction(AUDIO_STORE, 'readonly');
        const store = tx.objectStore(AUDIO_STORE);
        const get = store.get(audioId);
        get.onsuccess = () => resolve((get.result as Blob) ?? null);
        get.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

type PlayState = 'idle' | 'loading' | 'playing' | 'paused' | 'unavailable';

export function AudioPlayer({ audioId }: { audioId: string | null }) {
  const [state, setState] = useState<PlayState>('idle');
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  async function handlePlay() {
    if (state === 'playing') {
      audioRef.current?.pause();
      setState('paused');
      return;
    }

    if (state === 'paused') {
      audioRef.current?.play();
      setState('playing');
      return;
    }

    if (!audioId) {
      setState('unavailable');
      return;
    }

    setState('loading');

    let blob: Blob | null = null;
    try {
      blob = await getAudioFromIDB(audioId);
    } catch {
      blob = null;
    }

    if (!blob) {
      setState('unavailable');
      return;
    }

    const url = URL.createObjectURL(blob);
    urlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setState('idle');
      setCurrentTime(0);
    };

    audio.onerror = () => {
      setState('unavailable');
    };

    try {
      await audio.play();
      setState('playing');
    } catch {
      setState('unavailable');
    }
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.ontimeupdate = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.onloadedmetadata = null;
        audioRef.current = null;
      }
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  if (!audioId) return null;

  const isUnavailable = state === 'unavailable';
  const isPlaying = state === 'playing';
  const isLoading = state === 'loading';

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const timeLabel =
    isPlaying && duration
      ? `${formatTime(currentTime)} / ${formatTime(duration)}`
      : duration && state === 'idle'
      ? formatTime(duration)
      : null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handlePlay();
      }}
      disabled={isUnavailable}
      title={
        isUnavailable
          ? 'Audio not available on this device'
          : isPlaying
          ? 'Pause recording'
          : 'Play recording'
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--card-border)',
        background: isPlaying ? 'var(--accent-soft)' : 'var(--card-bg-strong)',
        color: isUnavailable ? 'var(--text-muted)' : isPlaying ? 'var(--accent)' : 'var(--text-primary)',
        fontSize: 12,
        fontWeight: 800,
        cursor: isUnavailable ? 'default' : 'pointer',
        opacity: isUnavailable ? 0.5 : 1,
        whiteSpace: 'nowrap',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      <span style={{ fontSize: 11, lineHeight: 1 }}>
        {isLoading
          ? '...'
          : isPlaying
          ? '⏸'
          : isUnavailable
          ? ' - '
          : '▶'}
      </span>
      <span>
        {isLoading
          ? 'Loading…'
          : isPlaying
          ? 'Pause'
          : isUnavailable
          ? 'No audio'
          : 'Play'}
      </span>
      {timeLabel && (
        <span
          style={{
            color: 'var(--text-muted)',
            fontWeight: 700,
            fontSize: 11,
          }}
        >
          {timeLabel}
        </span>
      )}
    </button>
  );
}
