"""
TRINETRA - Audio Feature Extraction Engine
Extracts LFCC, MFCC, Prosody, Pitch, and Spectral Artifact features from audio chunks.
"""

import os
import numpy as np
import scipy.signal
import scipy.fftpack

try:
    import librosa
    HAS_LIBROSA = True
except ImportError:
    HAS_LIBROSA = False

try:
    import soundfile as sf
    HAS_SOUNDFILE = True
except ImportError:
    HAS_SOUNDFILE = False


class AudioFeatureExtractor:
    """
    Extracts acoustic, spectral, prosodic, and LFCC/MFCC feature representations
    optimized for voice spoofing and AI voice cloning detection.
    """
    def __init__(self, sample_rate=16000, n_fft=1024, hop_length=256, n_mfcc=40, n_lfcc=40, n_mels=128):
        self.sample_rate = sample_rate
        self.n_fft = n_fft
        self.hop_length = hop_length
        self.n_mfcc = n_mfcc
        self.n_lfcc = n_lfcc
        self.n_mels = n_mels

    def compute_lfcc(self, y, sr=None):
        """
        Computes Linear Frequency Cepstral Coefficients (LFCC).
        LFCC is superior to MFCC for spoofing detection because synthetic speech 
        generators leave high-frequency vocoder artifacts that Mel-scaling suppresses.
        """
        sr = sr or self.sample_rate
        if HAS_LIBROSA:
            # Linear filter bank spectrogram
            stft = np.abs(librosa.stft(y=y, n_fft=self.n_fft, hop_length=self.hop_length))
            # Linear frequency filterbank
            n_filters = 60
            fft_freqs = np.linspace(0, sr / 2, stft.shape[0])
            filter_freqs = np.linspace(0, sr / 2, n_filters + 2)
            
            fbounds = filter_freqs
            fbank = np.zeros((n_filters, stft.shape[0]))
            for m in range(1, n_filters + 1):
                f_m_minus = fbounds[m - 1]
                f_m = fbounds[m]
                f_m_plus = fbounds[m + 1]

                for k in range(stft.shape[0]):
                    if f_m_minus <= fft_freqs[k] < f_m:
                        fbank[m - 1, k] = (fft_freqs[k] - f_m_minus) / (f_m - f_m_minus + 1e-8)
                    elif f_m <= fft_freqs[k] <= f_m_plus:
                        fbank[m - 1, k] = (f_m_plus - fft_freqs[k]) / (f_m_plus - f_m + 1e-8)

            linear_spectrogram = np.dot(fbank, stft)
            log_linear_spectrogram = np.log(linear_spectrogram + 1e-8)
            # Discrete Cosine Transform (DCT)
            lfcc = scipy.fftpack.dct(log_linear_spectrogram, type=2, axis=0, norm='ortho')[:self.n_lfcc, :]
            return lfcc
        else:
            # Fallback using scipy STFT
            f, t, Zxx = scipy.signal.stft(y, fs=sr, nperseg=self.n_fft, noverlap=self.n_fft - self.hop_length)
            mag = np.abs(Zxx)
            log_mag = np.log(mag + 1e-8)
            lfcc = scipy.fftpack.dct(log_mag, type=2, axis=0, norm='ortho')[:self.n_lfcc, :]
            return lfcc

    def compute_mfcc(self, y, sr=None):
        """Computes Mel-Frequency Cepstral Coefficients."""
        sr = sr or self.sample_rate
        if HAS_LIBROSA:
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=self.n_mfcc, n_fft=self.n_fft, hop_length=self.hop_length)
            return mfcc
        else:
            return self.compute_lfcc(y, sr)[:self.n_mfcc, :]

    def compute_prosodic_features(self, y, sr=None):
        """
        Extracts prosody and pitch dynamics ($F_0$, energy contour, jitter, shimmer estimates).
        Synthetic voices often exhibit unnatural pitch stability or robotic energy transitions.
        """
        sr = sr or self.sample_rate
        prosody = {}
        
        # Energy contour
        frame_len = self.n_fft
        hop_len = self.hop_length
        energy = np.array([np.sum(y[i:i+frame_len]**2) for i in range(0, len(y) - frame_len, hop_len)])
        if len(energy) == 0:
            energy = np.array([1e-8])
            
        prosody['energy_mean'] = float(np.mean(energy))
        prosody['energy_std'] = float(np.std(energy))
        prosody['energy_max'] = float(np.max(energy))
        prosody['energy_skew'] = float(scipy.stats.skew(energy) if len(energy) > 2 else 0.0)

        if HAS_LIBROSA:
            # Pitch (F0) tracking using YIN or piptrack
            try:
                pitches, magnitudes = librosa.piptrack(y=y, sr=sr, n_fft=self.n_fft, hop_length=self.hop_length)
                pitch_track = []
                for t in range(pitches.shape[1]):
                    index = magnitudes[:, t].argmax()
                    pitch = pitches[index, t]
                    if pitch > 50 and pitch < 500: # Human pitch bounds
                        pitch_track.append(pitch)
                
                if len(pitch_track) > 0:
                    prosody['pitch_mean'] = float(np.mean(pitch_track))
                    prosody['pitch_std'] = float(np.std(pitch_track))
                    prosody['pitch_min'] = float(np.min(pitch_track))
                    prosody['pitch_max'] = float(np.max(pitch_track))
                    prosody['pitch_range'] = float(np.max(pitch_track) - np.min(pitch_track))
                    # Pitch jitter estimate
                    pitch_diffs = np.abs(np.diff(pitch_track))
                    prosody['pitch_jitter'] = float(np.mean(pitch_diffs) / (np.mean(pitch_track) + 1e-8))
                else:
                    prosody['pitch_mean'] = 0.0
                    prosody['pitch_std'] = 0.0
                    prosody['pitch_min'] = 0.0
                    prosody['pitch_max'] = 0.0
                    prosody['pitch_range'] = 0.0
                    prosody['pitch_jitter'] = 0.0
            except Exception:
                prosody['pitch_mean'] = 0.0
                prosody['pitch_std'] = 0.0
                prosody['pitch_min'] = 0.0
                prosody['pitch_max'] = 0.0
                prosody['pitch_range'] = 0.0
                prosody['pitch_jitter'] = 0.0

        return prosody

    def compute_spectral_stats(self, y, sr=None):
        """Extracts spectral centroid, bandwidth, rolloff, flatness, zero-crossing rate."""
        sr = sr or self.sample_rate
        stats = {}
        if HAS_LIBROSA:
            centroid = librosa.feature.spectral_centroid(y=y, sr=sr, n_fft=self.n_fft, hop_length=self.hop_length)
            bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr, n_fft=self.n_fft, hop_length=self.hop_length)
            rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, n_fft=self.n_fft, hop_length=self.hop_length)
            flatness = librosa.feature.spectral_flatness(y=y, n_fft=self.n_fft, hop_length=self.hop_length)
            zcr = librosa.feature.zero_crossing_rate(y=y, frame_length=self.n_fft, hop_length=self.hop_length)

            stats['centroid_mean'] = float(np.mean(centroid))
            stats['centroid_std'] = float(np.std(centroid))
            stats['bandwidth_mean'] = float(np.mean(bandwidth))
            stats['bandwidth_std'] = float(np.std(bandwidth))
            stats['rolloff_mean'] = float(np.mean(rolloff))
            stats['rolloff_std'] = float(np.std(rolloff))
            stats['flatness_mean'] = float(np.mean(flatness))
            stats['flatness_std'] = float(np.std(flatness))
            stats['zcr_mean'] = float(np.mean(zcr))
            stats['zcr_std'] = float(np.std(zcr))
        else:
            stats['centroid_mean'] = 0.0
            stats['centroid_std'] = 0.0
            stats['bandwidth_mean'] = 0.0
            stats['bandwidth_std'] = 0.0
            stats['rolloff_mean'] = 0.0
            stats['rolloff_std'] = 0.0
            stats['flatness_mean'] = 0.0
            stats['flatness_std'] = 0.0
            stats['zcr_mean'] = float(np.mean(np.abs(np.diff(np.sign(y))))) / 2.0
            stats['zcr_std'] = 0.0

        return stats

    def extract_feature_vector(self, y, sr=None):
        """
        Combines LFCC, MFCC, Prosodic, and Spectral stats into a 1D feature vector.
        """
        sr = sr or self.sample_rate
        # Ensure 1D audio array
        if y.ndim > 1:
            y = np.mean(y, axis=1)

        # 1. LFCC stats (mean, std, delta mean, delta std)
        lfcc = self.compute_lfcc(y, sr)
        lfcc_mean = np.mean(lfcc, axis=1)
        lfcc_std = np.std(lfcc, axis=1)
        lfcc_delta = np.diff(lfcc, axis=1) if lfcc.shape[1] > 1 else np.zeros((lfcc.shape[0], 1))
        lfcc_delta_mean = np.mean(lfcc_delta, axis=1)
        lfcc_delta_std = np.std(lfcc_delta, axis=1)

        # 2. MFCC stats
        mfcc = self.compute_mfcc(y, sr)
        mfcc_mean = np.mean(mfcc, axis=1)
        mfcc_std = np.std(mfcc, axis=1)

        # 3. Prosody features
        prosody = self.compute_prosodic_features(y, sr)
        prosody_vals = np.array(list(prosody.values()))

        # 4. Spectral stats
        spec_stats = self.compute_spectral_stats(y, sr)
        spec_vals = np.array(list(spec_stats.values()))

        # Concatenate into unified feature vector
        vector = np.concatenate([
            lfcc_mean, lfcc_std, lfcc_delta_mean, lfcc_delta_std,
            mfcc_mean, mfcc_std,
            prosody_vals, spec_vals
        ])

        return np.nan_to_num(vector, nan=0.0, posinf=0.0, neginf=0.0)
