"""
TRINETRA - Audio Dataset Loader and Parser
Supports ASVspoof 2019 (LA/PA protocol formats), directory structures, and CSV metadata.
"""

import os
import glob
import numpy as np
import pandas as pd
import soundfile as sf
import librosa
from tqdm import tqdm
from features import AudioFeatureExtractor

class AudioDatasetLoader:
    def __init__(self, raw_dir="data/raw", sample_rate=16000, duration_sec=3.0, feature_extractor=None):
        self.raw_dir = raw_dir
        self.sample_rate = sample_rate
        self.target_length = int(sample_rate * duration_sec)
        self.feature_extractor = feature_extractor or AudioFeatureExtractor(sample_rate=sample_rate)

    def load_and_preprocess_audio(self, file_path):
        """Loads audio file (.flac, .wav, .mp3, .ogg), resamples to target rate, and pads/crops."""
        try:
            audio, sr = sf.read(file_path)
            if audio.ndim > 1:
                audio = np.mean(audio, axis=1) # Convert to mono
            
            if sr != self.sample_rate:
                audio = librosa.resample(audio, orig_sr=sr, target_sr=self.sample_rate)

            # Silence trimming / VAD
            non_silent_idx = librosa.effects.split(audio, top_db=40)
            if len(non_silent_idx) > 0:
                audio = np.concatenate([audio[start:end] for start, end in non_silent_idx])

            # Pad or trim to target length
            if len(audio) < self.target_length:
                padding = self.target_length - len(audio)
                audio = np.pad(audio, (0, padding), mode='constant')
            else:
                audio = audio[:self.target_length]

            return audio, self.sample_rate
        except Exception as e:
            # Generate quiet noise as fallback for corrupt audio
            return np.random.normal(0, 1e-4, self.target_length), self.sample_rate

    def scan_asvspoof2019(self):
        """
        Scans data/raw for ASVspoof 2019 protocol files and audio files.
        Protocol line format: speaker_id audio_filename - system_id label
        e.g., LA_0079 LA_T_1138241 - - bonafide (bonafide = 0 genuine, spoof = 1 synthetic)
        """
        samples = []
        protocol_files = glob.glob(os.path.join(self.raw_dir, "**", "*.txt"), recursive=True)
        flac_files = {os.path.splitext(os.path.basename(p))[0]: p for p in glob.glob(os.path.join(self.raw_dir, "**", "*.flac"), recursive=True)}
        wav_files = {os.path.splitext(os.path.basename(p))[0]: p for p in glob.glob(os.path.join(self.raw_dir, "**", "*.wav"), recursive=True)}
        all_audio_files = {**flac_files, **wav_files}

        if protocol_files:
            for proto_path in protocol_files:
                if "cm" in os.path.basename(proto_path) or "protocol" in os.path.basename(proto_path).lower():
                    with open(proto_path, "r", encoding="utf-8") as f:
                        for line in f:
                            parts = line.strip().split()
                            if len(parts) >= 5:
                                audio_id = parts[1]
                                key = parts[4].lower() # bonafide or spoof
                                label = 0 if key == "bonafide" else 1
                                if audio_id in all_audio_files:
                                    samples.append({
                                        "file_path": all_audio_files[audio_id],
                                        "audio_id": audio_id,
                                        "label": label,
                                        "attack_type": parts[3] if len(parts) > 3 else "unknown"
                                    })

        return pd.DataFrame(samples)

    def scan_directory_structure(self):
        """Scans data/raw for genuine/ vs synthetic/ subfolders."""
        samples = []
        genuine_files = glob.glob(os.path.join(self.raw_dir, "**", "genuine", "*.*"), recursive=True) + \
                        glob.glob(os.path.join(self.raw_dir, "genuine", "*.*"))
        synthetic_files = glob.glob(os.path.join(self.raw_dir, "**", "synthetic", "*.*"), recursive=True) + \
                          glob.glob(os.path.join(self.raw_dir, "synthetic", "*.*")) + \
                          glob.glob(os.path.join(self.raw_dir, "**", "spoof", "*.*"), recursive=True)

        for p in genuine_files:
            if p.endswith((".wav", ".flac", ".mp3", ".ogg")):
                samples.append({"file_path": p, "label": 0, "attack_type": "genuine"})
        for p in synthetic_files:
            if p.endswith((".wav", ".flac", ".mp3", ".ogg")):
                samples.append({"file_path": p, "label": 1, "attack_type": "synthetic"})

        return pd.DataFrame(samples)

    def get_dataset(self):
        """Discovers dataset samples from ASVspoof protocol files or directory layout."""
        df_asv = self.scan_asvspoof2019()
        if not df_asv.empty:
            print(f"[Dataset] Found {len(df_asv)} ASVspoof 2019 samples.")
            return df_asv

        df_dir = self.scan_directory_structure()
        if not df_dir.empty:
            print(f"[Dataset] Found {len(df_dir)} directory-structured samples.")
            return df_dir

        raise FileNotFoundError(
    f"[Dataset] No real audio dataset found in '{self.raw_dir}'. "
    "Please place the ASVspoof dataset in data/raw."
)

    def generate_synthetic_sample_dataset(self, num_genuine=100, num_synthetic=100):
        """Generates synthetic benchmark audio samples for pipeline verification if raw data isn't ready."""
        os.makedirs("data/processed/benchmark", exist_ok=True)
        samples = []

        # Genuine: Natural speech simulation (harmonic tones + natural vocal formants + low noise)
        for i in range(num_genuine):
            t = np.linspace(0, 3.0, self.target_length)
            f0 = np.random.uniform(100, 220)
            # Pitch modulation
            pitch_contour = f0 + 15 * np.sin(2 * np.pi * 1.5 * t)
            phase = 2 * np.pi * np.cumsum(pitch_contour) / self.sample_rate
            harmonics = np.sin(phase) + 0.5 * np.sin(2 * phase) + 0.25 * np.sin(3 * phase)
            noise = np.random.normal(0, 0.01, self.target_length)
            audio = harmonics + noise
            
            path = os.path.join("data/processed/benchmark", f"genuine_{i:04d}.wav")
            sf.write(path, audio.astype(np.float32), self.sample_rate)
            samples.append({"file_path": path, "label": 0, "attack_type": "genuine"})

        # Synthetic: AI voice cloning simulation (robot pitch flatness + high-frequency vocoder spectral ripple)
        for i in range(num_synthetic):
            t = np.linspace(0, 3.0, self.target_length)
            f0 = np.random.uniform(120, 200)
            # Artificial constant pitch (robotic)
            phase = 2 * np.pi * f0 * t
            harmonics = np.sin(phase) + 0.3 * np.sin(2 * phase)
            # High-frequency vocoder artifact (linear frequency buzz above 4kHz)
            hf_artifact = 0.08 * np.sin(2 * np.pi * 6500 * t)
            audio = harmonics + hf_artifact
            
            path = os.path.join("data/processed/benchmark", f"synthetic_{i:04d}.wav")
            sf.write(path, audio.astype(np.float32), self.sample_rate)
            samples.append({"file_path": path, "label": 1, "attack_type": "synthetic"})

        df = pd.DataFrame(samples)
        print(f"[Dataset] Generated {len(df)} synthetic benchmark audio samples in data/processed/benchmark.")
        return df

    def extract_features_dataset(self, df):
        """Extracts feature matrices (X) and labels (y) from audio dataset dataframe."""
        X_list = []
        y_list = []

        print("[Dataset] Extracting features (LFCC, MFCC, Prosody, Spectral)...")
        for idx, row in tqdm(df.iterrows(), total=len(df)):
            audio, sr = self.load_and_preprocess_audio(row['file_path'])
            feat = self.feature_extractor.extract_feature_vector(audio, sr)
            X_list.append(feat)
            y_list.append(row['label'])

        X = np.array(X_list)
        y = np.array(y_list)
        return X, y
