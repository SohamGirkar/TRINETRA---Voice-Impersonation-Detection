// Audio DSP Engine: Manages Web Audio API, AnalyserNode, Microphone Capture, and Frequency Extraction

import { normalizeFrequencyBands } from '../lib/audioMath';

class AudioEngineService {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isCapturing: boolean = false;
  private dataArray: Uint8Array | null = null;

  public async startMicrophoneCapture(): Promise<boolean> {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.micStream);
      this.sourceNode.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.isCapturing = true;
      return true;
    } catch (err) {
      console.warn('Microphone capture not allowed or unavailable:', err);
      this.isCapturing = false;
      return false;
    }
  }

  public stopMicrophoneCapture(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.isCapturing = false;
  }

  public getLiveFrequencyBands(bandCount: number = 32): number[] | null {
    if (!this.isCapturing || !this.analyser || !this.dataArray) {
      return null;
    }

    (this.analyser as AnalyserNode).getByteFrequencyData(this.dataArray as any);
    return normalizeFrequencyBands(this.dataArray, bandCount);
  }

  public isLiveActive(): boolean {
    return this.isCapturing;
  }
}

export const audioEngine = new AudioEngineService();
