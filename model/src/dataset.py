"""
TRINETRA - Audio Dataset Loader

Supports:
- ASVspoof 2019
- Common Voice Spontaneous Speech
- Directory-based genuine/spoof datasets

Pipeline:
audio -> mono -> 16 kHz -> normalize -> silence trim
      -> overlapping 3-second chunks -> features
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

    def __init__(
        self,
        raw_dir="data/raw",
        sample_rate=16000,
        duration_sec=3.0,
        feature_extractor=None,
        chunk_hop_sec=1.5,
    ):
        self.raw_dir = raw_dir
        self.sample_rate = sample_rate
        self.duration_sec = duration_sec
        self.target_length = int(
            sample_rate * duration_sec
        )
        self.chunk_hop_sec = chunk_hop_sec

        self.feature_extractor = (
            feature_extractor
            or AudioFeatureExtractor(
                sample_rate=sample_rate
            )
        )

    # ================================================================
    # AUDIO
    # ================================================================

    def load_audio(self, file_path):
        audio, sr = sf.read(file_path)

        if audio.ndim > 1:
            audio = np.mean(
                audio,
                axis=1
            )

        audio = audio.astype(
            np.float32
        )

        if sr != self.sample_rate:
            audio = librosa.resample(
                audio,
                orig_sr=sr,
                target_sr=self.sample_rate
            )

        peak = (
            float(
                np.max(
                    np.abs(audio)
                )
            )
            if len(audio) > 0
            else 0.0
        )

        if peak > 0:
            audio = audio / peak

        return audio, self.sample_rate

    # ================================================================
    # SILENCE
    # ================================================================

    def trim_silence(self, audio):

        intervals = librosa.effects.split(
            audio,
            top_db=40
        )

        if len(intervals) == 0:
            return audio

        return np.concatenate(
            [
                audio[start:end]
                for start, end in intervals
            ]
        )

    # ================================================================
    # CHUNKING
    # ================================================================

    def split_into_chunks(self, audio):

        chunk_length = self.target_length

        hop_length = max(
            1,
            int(
                self.sample_rate
                * self.chunk_hop_sec
            )
        )

        # Short recording
        if len(audio) <= chunk_length:

            if len(audio) < chunk_length:

                audio = np.pad(
                    audio,
                    (
                        0,
                        chunk_length
                        - len(audio)
                    ),
                    mode="constant"
                )

            return [
                audio.astype(
                    np.float32
                )
            ]

        chunks = []

        for start in range(
            0,
            len(audio)
            - chunk_length
            + 1,
            hop_length
        ):

            chunk = audio[
                start:
                start + chunk_length
            ]

            chunks.append(
                chunk.astype(
                    np.float32
                )
            )

        # Always include final section
        final_chunk = audio[
            -chunk_length:
        ].astype(
            np.float32
        )

        if not np.array_equal(
            final_chunk,
            chunks[-1]
        ):
            chunks.append(
                final_chunk
            )

        return chunks

    # ================================================================
    # PREPROCESS
    # ================================================================

    def load_and_preprocess_audio(
        self,
        file_path
    ):

        audio, _ = self.load_audio(
            file_path
        )

        audio = self.trim_silence(
            audio
        )

        return self.split_into_chunks(
            audio
        )

    # ================================================================
    # ASVSPOOF
    # ================================================================

    def scan_asvspoof2019(self):

        samples = []

        protocol_files = glob.glob(
            os.path.join(
                self.raw_dir,
                "**",
                "*.txt"
            ),
            recursive=True
        )

        audio_files = {}

        for pattern in [
            "**/*.flac",
            "**/*.wav"
        ]:

            for path in glob.glob(
                os.path.join(
                    self.raw_dir,
                    pattern
                ),
                recursive=True
            ):

                audio_id = os.path.splitext(
                    os.path.basename(path)
                )[0]

                audio_files[
                    audio_id
                ] = path

        for proto_path in protocol_files:

            filename = (
                os.path.basename(
                    proto_path
                ).lower()
            )

            if (
                "cm" not in filename
                and
                "protocol" not in filename
            ):
                continue

            try:

                with open(
                    proto_path,
                    "r",
                    encoding="utf-8"
                ) as file:

                    for line in file:

                        parts = (
                            line.strip()
                            .split()
                        )

                        if len(parts) < 5:
                            continue

                        audio_id = parts[1]

                        label_text = (
                            parts[4]
                            .lower()
                        )

                        label = (
                            0
                            if label_text
                            == "bonafide"
                            else 1
                        )

                        if (
                            audio_id
                            not in audio_files
                        ):
                            continue

                        samples.append(
                            {
                                "file_path":
                                    audio_files[
                                        audio_id
                                    ],
                                "audio_id":
                                    audio_id,
                                "label":
                                    label,
                                "attack_type":
                                    (
                                        parts[3]
                                        if len(parts)
                                        > 3
                                        else "unknown"
                                    ),
                                "source":
                                    "asvspoof"
                            }
                        )

            except Exception as exc:

                print(
                    f"[Warning] Could not read "
                    f"{proto_path}: {exc}"
                )

        if not samples:
            return pd.DataFrame()

        return (
            pd.DataFrame(
                samples
            )
            .drop_duplicates(
                subset=[
                    "file_path",
                    "label"
                ]
            )
            .reset_index(
                drop=True
            )
        )

    # ================================================================
    # COMMON VOICE
    # ================================================================

    def scan_common_voice(self):

        samples = []

        # Find all MP3 recordings under Common Voice
        common_voice_root = os.path.join(
            self.raw_dir,
            "Common Voice"
        )

        mp3_files = glob.glob(
            os.path.join(
                common_voice_root,
                "**",
                "*.mp3"
            ),
            recursive=True
        )

        if not mp3_files:

            # Also support lowercase folder
            common_voice_root = os.path.join(
                self.raw_dir,
                "common_voice"
            )

            mp3_files = glob.glob(
                os.path.join(
                    common_voice_root,
                    "**",
                    "*.mp3"
                ),
                recursive=True
            )

        for path in mp3_files:

            samples.append(
                {
                    "file_path": path,
                    "audio_id": os.path.splitext(
                        os.path.basename(path)
                    )[0],
                    "label": 0,
                    "attack_type": "common_voice_genuine",
                    "source": "common_voice"
                }
            )

        if samples:

            df = pd.DataFrame(
                samples
            )

            print(
                f"[Common Voice] Found "
                f"{len(df)} human recordings."
            )

            return df

        print(
            "[Common Voice] No MP3 files found."
        )

        return pd.DataFrame()

    # ================================================================
    # DIRECTORY DATASETS
    # ================================================================

    def scan_directory_structure(self):

        samples = []

        valid_extensions = (
            ".wav",
            ".flac",
            ".mp3",
            ".ogg"
        )

        genuine_files = (
            glob.glob(
                os.path.join(
                    self.raw_dir,
                    "**",
                    "genuine",
                    "*.*"
                ),
                recursive=True
            )
        )

        synthetic_files = (
            glob.glob(
                os.path.join(
                    self.raw_dir,
                    "**",
                    "synthetic",
                    "*.*"
                ),
                recursive=True
            )
            +
            glob.glob(
                os.path.join(
                    self.raw_dir,
                    "**",
                    "spoof",
                    "*.*"
                ),
                recursive=True
            )
        )

        for path in genuine_files:

            if path.lower().endswith(
                valid_extensions
            ):

                samples.append(
                    {
                        "file_path":
                            path,
                        "label": 0,
                        "attack_type":
                            "genuine",
                        "source":
                            "custom"
                    }
                )

        for path in synthetic_files:

            if path.lower().endswith(
                valid_extensions
            ):

                samples.append(
                    {
                        "file_path":
                            path,
                        "label": 1,
                        "attack_type":
                            "synthetic",
                        "source":
                            "custom"
                    }
                )

        return pd.DataFrame(
            samples
        )

    # ================================================================
    # COMBINED DATASET
    # ================================================================

    def get_dataset(self):

        datasets = []

        # ASVspoof
        df_asv = (
            self.scan_asvspoof2019()
        )

        if not df_asv.empty:

            print(
                f"[ASVspoof] Found "
                f"{len(df_asv)} recordings."
            )

            datasets.append(
                df_asv
            )

        # Common Voice
        df_cv = (
            self.scan_common_voice()
        )

        if not df_cv.empty:
            datasets.append(
                df_cv
            )

        # Optional custom folders
        df_custom = (
            self.scan_directory_structure()
        )

        if not df_custom.empty:

            print(
                f"[Custom] Found "
                f"{len(df_custom)} recordings."
            )

            datasets.append(
                df_custom
            )

        if not datasets:

            raise FileNotFoundError(
                f"[Dataset] No supported "
                f"audio data found in "
                f"'{self.raw_dir}'."
            )

        combined = pd.concat(
            datasets,
            ignore_index=True
        )

        combined = (
            combined
            .drop_duplicates(
                subset=[
                    "file_path",
                    "label"
                ]
            )
            .reset_index(
                drop=True
            )
        )

        print()
        print(
            "[Dataset] Combined dataset:"
        )

        print(
            f"  Total   : "
            f"{len(combined)}"
        )

        print(
            f"  Genuine : "
            f"{int((combined['label'] == 0).sum())}"
        )

        print(
            f"  Spoof   : "
            f"{int((combined['label'] == 1).sum())}"
        )

        if "source" in combined:

            print()

            print(
                "[Dataset] Sources:"
            )

            print(
                combined[
                    "source"
                ].value_counts()
            )

        return combined

    # ================================================================
    # FEATURE EXTRACTION
    # ================================================================

    def extract_features_dataset(
        self,
        df,
        max_chunks_per_file=2,
        common_voice_max_files=10000
    ):

        X_list = []
        y_list = []

        print()
        print(
            "[Dataset] Extracting "
            "3-second chunk features..."
        )

        # ------------------------------------------------------------
        # Limit Common Voice
        # ------------------------------------------------------------
        #
        # We don't want thousands of Common Voice files to overwhelm
        # ASVspoof. A controlled subset keeps the training balanced.
        #

        cv_df = df[
            df.get(
                "source",
                pd.Series(
                    index=df.index,
                    dtype=object
                )
            )
            == "common_voice"
        ]

        other_df = df[
            df.get(
                "source",
                pd.Series(
                    index=df.index,
                    dtype=object
                )
            )
            != "common_voice"
        ]

        if len(cv_df) > common_voice_max_files:

            cv_df = cv_df.sample(
                n=common_voice_max_files,
                random_state=42
            )

        working_df = pd.concat(
            [
                other_df,
                cv_df
            ],
            ignore_index=True
        )

        skipped = 0

        for _, row in tqdm(
            working_df.iterrows(),
            total=len(working_df)
        ):

            try:

                chunks = (
                    self.load_and_preprocess_audio(
                        row["file_path"]
                    )
                )

                # Keep compute manageable
                if (
                    len(chunks)
                    > max_chunks_per_file
                ):

                    indices = (
                        np.linspace(
                            0,
                            len(chunks) - 1,
                            max_chunks_per_file
                        )
                        .round()
                        .astype(int)
                    )

                    chunks = [
                        chunks[i]
                        for i in indices
                    ]

                for chunk in chunks:

                    feature_vector = (
                        self.feature_extractor
                        .extract_feature_vector(
                            chunk,
                            self.sample_rate
                        )
                    )

                    X_list.append(
                        feature_vector
                    )

                    y_list.append(
                        int(row["label"])
                    )

            except Exception as exc:

                skipped += 1

                print(
                    f"[Warning] Skipping "
                    f"{row['file_path']}: "
                    f"{exc}"
                )

        if skipped:

            print(
                f"[Dataset] Skipped "
                f"{skipped} files."
            )

        if not X_list:

            raise RuntimeError(
                "[Dataset] No features extracted."
            )

        return (
            np.asarray(
                X_list,
                dtype=np.float32
            ),
            np.asarray(
                y_list,
                dtype=np.int64
            )
        )