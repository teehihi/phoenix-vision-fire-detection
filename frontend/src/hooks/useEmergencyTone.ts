import { useEffect, useRef } from 'react';
import type { EmergencyState } from '../types/detection';
import { publicAsset } from '../lib/assets';

const volumeByState: Record<EmergencyState, number> = {
  monitoring: 0,
  warning: 0.45,
  emergency: 0.7,
  critical: 1
};

export function useEmergencyTone(state: EmergencyState, enabled: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasAudibleRef = useRef(false);

  useEffect(() => {
    audioRef.current ??= new Audio(publicAsset('alert.mp3'));
    const audio = audioRef.current;
    audio.loop = true;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!enabled || state === 'monitoring') {
      audio.pause();
      audio.currentTime = 0;
      wasAudibleRef.current = false;
      return;
    }

    audio.volume = volumeByState[state];
    if (!wasAudibleRef.current || audio.paused) {
      wasAudibleRef.current = true;
      audio.play().catch(() => {
        // Electron/browser may require one user interaction before audio playback.
      });
    }
  }, [enabled, state]);
}
