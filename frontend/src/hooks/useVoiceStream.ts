import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../services/audioEngine';
import { generateSyntheticFrequencyBands } from '../lib/audioMath';

export function useVoiceStream(riskScore: number, isLiveMicRequested: boolean) {
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [frequencyBands, setFrequencyBands] = useState<number[]>(() => 
    generateSyntheticFrequencyBands(0, riskScore)
  );
  const [audioLevel, setAudioLevel] = useState<number>(0.4);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  const toggleMicrophone = useCallback(async () => {
    if (isMicActive) {
      audioEngine.stopMicrophoneCapture();
      setIsMicActive(false);
    } else {
      const success = await audioEngine.startMicrophoneCapture();
      setIsMicActive(success);
    }
  }, [isMicActive]);

  useEffect(() => {
    if (isLiveMicRequested && !isMicActive) {
      toggleMicrophone();
    } else if (!isLiveMicRequested && isMicActive) {
      toggleMicrophone();
    }
  }, [isLiveMicRequested, isMicActive, toggleMicrophone]);

  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      timeRef.current += delta;

      if (isMicActive) {
        const liveBands = audioEngine.getLiveFrequencyBands(32);
        if (liveBands) {
          setFrequencyBands(liveBands);
          const avg = liveBands.reduce((a, b) => a + b, 0) / liveBands.length;
          setAudioLevel(avg);
        }
      } else {
        // High-precision synthetic audio frequency simulation
        const synthBands = generateSyntheticFrequencyBands(timeRef.current, riskScore);
        setFrequencyBands(synthBands);
        const avg = synthBands.reduce((a, b) => a + b, 0) / synthBands.length;
        setAudioLevel(avg);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isMicActive, riskScore]);

  return {
    isMicActive,
    toggleMicrophone,
    frequencyBands,
    audioLevel
  };
}
