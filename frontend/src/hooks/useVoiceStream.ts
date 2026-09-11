import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';

import { audioEngine } from '../services/audioEngine';
import { apiService } from '../services/api';
import { generateSyntheticFrequencyBands } from '../lib/audioMath';

export function useVoiceStream(
  riskScore: number,
  isLiveMicRequested: boolean
) {
  const [isMicActive, setIsMicActive] =
    useState(false);

  const [frequencyBands, setFrequencyBands] =
    useState<number[]>(
      () =>
        generateSyntheticFrequencyBands(
          0,
          riskScore
        )
    );

  const [audioLevel, setAudioLevel] =
    useState(0.4);

  const [
    livePrediction,
    setLivePrediction,
  ] = useState<any>(null);

  const recorderRef =
    useRef<MediaRecorder | null>(null);

  const recordingLoopRef =
    useRef<number | null>(null);

  const shouldContinueRef =
    useRef(false);

  const animFrameRef =
    useRef<number | null>(null);

  const timeRef =
    useRef(0);

  // ------------------------------------------------------------
  // MICROPHONE
  // ------------------------------------------------------------

  const startMic =
    useCallback(async () => {

      const success =
        await audioEngine.startMicrophoneCapture();

      setIsMicActive(success);

      return success;

    }, []);

  const stopMic =
    useCallback(() => {

      shouldContinueRef.current =
        false;

      if (
        recorderRef.current &&
        recorderRef.current.state !==
          'inactive'
      ) {
        recorderRef.current.stop();
      }

      recorderRef.current = null;

      audioEngine.stopMicrophoneCapture();

      setIsMicActive(false);

    }, []);

  const toggleMicrophone =
    useCallback(async () => {

      if (isMicActive) {
        stopMic();
      } else {
        await startMic();
      }

    }, [
      isMicActive,
      startMic,
      stopMic,
    ]);

  // ------------------------------------------------------------
  // 3 SECOND LIVE RECORDING
  // ------------------------------------------------------------

  const analyzeNextChunk =
    useCallback(async () => {

      if (
        !shouldContinueRef.current
      ) {
        return;
      }

      const stream =
        audioEngine.getMediaStream();

      if (!stream) {
        return;
      }

      if (
        typeof MediaRecorder ===
        'undefined'
      ) {
        console.error(
          'MediaRecorder not supported.'
        );
        return;
      }

      const mimeType =
        MediaRecorder.isTypeSupported(
          'audio/webm;codecs=opus'
        )
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

      const recorder =
        new MediaRecorder(
          stream,
          {
            mimeType,
          }
        );

      recorderRef.current =
        recorder;

      const chunks: Blob[] = [];

      recorder.ondataavailable =
        (event) => {

          if (
            event.data &&
            event.data.size > 0
          ) {
            chunks.push(
              event.data
            );
          }
        };

      recorder.onstop =
        async () => {

          if (
            chunks.length === 0
          ) {
            return;
          }

          const blob =
            new Blob(
              chunks,
              {
                type: mimeType,
              }
            );

          try {

            const prediction =
              await apiService.analyzeLiveChunk(
                blob
              );

            setLivePrediction(
              prediction
            );

          } catch (error) {

            console.error(
              'Live audio analysis failed:',
              error
            );

          }

          recorderRef.current =
            null;

          if (
            shouldContinueRef.current
          ) {
            analyzeNextChunk();
          }
        };

      recorder.onerror =
        (event) => {

          console.error(
            'MediaRecorder error:',
            event
          );

          recorderRef.current =
            null;

          if (
            shouldContinueRef.current
          ) {
            analyzeNextChunk();
          }
        };

      recorder.start();

      window.setTimeout(() => {

        if (
          recorder.state !==
          'inactive'
        ) {
          recorder.stop();
        }

      }, 3000);

    }, []);

  // ------------------------------------------------------------
  // START / STOP LIVE ANALYSIS
  // ------------------------------------------------------------

  useEffect(() => {

    if (
      isLiveMicRequested &&
      isMicActive
    ) {

      shouldContinueRef.current =
        true;

      analyzeNextChunk();

    } else {

      shouldContinueRef.current =
        false;

    }

  }, [
    isLiveMicRequested,
    isMicActive,
    analyzeNextChunk,
  ]);

  // ------------------------------------------------------------
  // MIC REQUEST STATE
  // ------------------------------------------------------------

  useEffect(() => {

    if (
      isLiveMicRequested &&
      !isMicActive
    ) {
      startMic();

    } else if (
      !isLiveMicRequested &&
      isMicActive
    ) {
      stopMic();
    }

  }, [
    isLiveMicRequested,
    isMicActive,
    startMic,
    stopMic,
  ]);

  // ------------------------------------------------------------
  // LIVE VISUALIZER
  // ------------------------------------------------------------

  useEffect(() => {

    let lastTime =
      performance.now();

    const loop =
      (now: number) => {

        const delta =
          (now - lastTime) / 1000;

        lastTime = now;

        timeRef.current +=
          delta;

        if (isMicActive) {

          const bands =
            audioEngine.getLiveFrequencyBands(
              32
            );

          if (bands) {

            setFrequencyBands(
              bands
            );

            const average =
              bands.reduce(
                (a, b) =>
                  a + b,
                0
              ) / bands.length;

            setAudioLevel(
              average
            );
          }

        } else {

          const bands =
            generateSyntheticFrequencyBands(
              timeRef.current,
              riskScore
            );

          setFrequencyBands(
            bands
          );

          const average =
            bands.reduce(
              (a, b) =>
                a + b,
              0
            ) / bands.length;

          setAudioLevel(
            average
          );
        }

        animFrameRef.current =
          requestAnimationFrame(
            loop
          );
      };

    animFrameRef.current =
      requestAnimationFrame(
        loop
      );

    return () => {

      if (
        animFrameRef.current
      ) {
        cancelAnimationFrame(
          animFrameRef.current
        );
      }

    };

  }, [
    isMicActive,
    riskScore,
  ]);

  return {
    isMicActive,
    toggleMicrophone,
    frequencyBands,
    audioLevel,
    livePrediction,
  };
}