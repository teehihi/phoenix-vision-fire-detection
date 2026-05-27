import { useEffect, useRef } from 'react';
import type { EmergencyState } from '../types/detection';

type WebAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const toneMap: Record<EmergencyState, { interval: number; frequency: number; duration: number } | null> = {
  monitoring: null,
  warning: { interval: 1800, frequency: 520, duration: 120 },
  emergency: { interval: 900, frequency: 720, duration: 180 },
  critical: { interval: 420, frequency: 920, duration: 240 }
};

export function useEmergencyTone(state: EmergencyState, enabled: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled || state === 'monitoring') {
      return;
    }

    const tone = toneMap[state];
    if (!tone) {
      return;
    }

    const playTone = () => {
      const audioWindow = window as WebAudioWindow;
      const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }
      audioContextRef.current ??= new AudioContextClass();
      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = state === 'critical' ? 'sawtooth' : 'sine';
      oscillator.frequency.value = tone.frequency;
      gain.gain.value = state === 'critical' ? 0.09 : 0.05;

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + tone.duration / 1000);
    };

    playTone();
    const intervalId = window.setInterval(playTone, tone.interval);
    return () => window.clearInterval(intervalId);
  }, [enabled, state]);
}
