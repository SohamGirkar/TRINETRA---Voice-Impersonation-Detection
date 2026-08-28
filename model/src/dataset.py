"""
TRINETRA - Audio Dataset Loader and Parser

Supports:
- ASVspoof 2019 LA protocol format
- Directory-based genuine/spoof datasets
- WAV and FLAC audio
- Audio preprocessing
- Feature extraction

ASVspoof 2019 LA CM protocol format:

    speaker_id audio_id - system_id label

Example:

    LA_0079 LA_T_1138241 - A06 spoof

Labels:
    0 = bonafide / genuine
    1 = spoof / synthetic
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
        feature_extractor=None
    ):
        self.raw_dir = raw_dir
        self.sample_rate = sample_rate
        self.target_length = int(sample_rate * duration_sec)

        self.feature_extractor = (
            feature_extractor
            or AudioFeatureExtractor(
                sample_rate=sample_rate
            )
        )

    # ============================================================
    # AUDIO PREPROCESSING
    # ============================================================

    def load_and_preprocess_audio(self, file_path):
        """
        Load an audio file and standardize it.

        Steps:
        1. Load audio
        2. Convert stereo to mono
        3. Resample to target sample rate
        4. Remove silence
        5. Normalize amplitude
        6. Crop/pad to fixed duration
        """

        try:
            # ----------------------------------------------------
            # Load audio
            # ----------------------------------------------------

            audio, sr = sf.read(file_path)

            audio = np.asarray(
                audio,
                dtype=np.float32
            )

            # ----------------------------------------------------
            # Convert stereo to mono
            # ----------------------------------------------------

            if audio.ndim > 1:
                audio = np.mean(
                    audio,
                    axis=1
                )

            # ----------------------------------------------------
            # Resample
            # ----------------------------------------------------

            if sr != self.sample_rate:

                audio = librosa.resample(
                    audio,
                    orig_sr=sr,
                    target_sr=self.sample_rate
                )

            # ----------------------------------------------------
            # Remove silence
            # ----------------------------------------------------

            non_silent_idx = librosa.effects.split(
                audio,
                top_db=40
            )

            if len(non_silent_idx) > 0:

                audio = np.concatenate(
                    [
                        audio[start:end]
                        for start, end in non_silent_idx
                    ]
                )

            # ----------------------------------------------------
            # Normalize audio
            # ----------------------------------------------------

            max_amplitude = np.max(
                np.abs(audio)
            )

            if max_amplitude > 0:

                audio = (
                    audio / max_amplitude
                )

            # ----------------------------------------------------
            # Pad or crop to target length
            # ----------------------------------------------------

            if len(audio) < self.target_length:

                padding = (
                    self.target_length
                    - len(audio)
                )

                audio = np.pad(
                    audio,
                    (0, padding),
                    mode="constant"
                )

            else:

                audio = audio[
                    :self.target_length
                ]

            return audio, self.sample_rate

        except Exception as e:

            print(
                f"\n[Warning] Could not process audio:"
            )

            print(
                f"File: {file_path}"
            )

            print(
                f"Reason: {e}"
            )

            # Return None so corrupted files
            # can be skipped safely.
            return None, None

    # ============================================================
    # ASVSPOOF 2019 LA
    # ============================================================

    def scan_asvspoof2019(self):
        """
        Scan data/raw recursively for ASVspoof 2019 LA
        protocol files and corresponding audio files.

        ASVspoof 2019 LA CM protocol:

            speaker_id audio_id - system_id label

        Example:

            LA_0079 LA_T_1138241 - A06 spoof

        Fields:

            parts[0] = speaker ID
            parts[1] = audio ID
            parts[2] = "-"
            parts[3] = attack/system ID
            parts[4] = label

        Labels:

            bonafide -> 0
            spoof    -> 1
        """

        samples = []

        # ========================================================
        # FIND PROTOCOL FILES
        # ========================================================

        protocol_files = glob.glob(
            os.path.join(
                self.raw_dir,
                "**",
                "*.txt"
            ),
            recursive=True
        )

        if not protocol_files:

            print(
                "[Dataset] No protocol .txt files found."
            )

            return pd.DataFrame()

        # ========================================================
        # FIND AUDIO FILES
        # ========================================================

        audio_files = {}

        # --------------------------------------------------------
        # FLAC files
        # --------------------------------------------------------

        flac_files = glob.glob(
            os.path.join(
                self.raw_dir,
                "**",
                "*.flac"
            ),
            recursive=True
        )

        # --------------------------------------------------------
        # WAV files
        # --------------------------------------------------------

        wav_files = glob.glob(
            os.path.join(
                self.raw_dir,
                "**",
                "*.wav"
            ),
            recursive=True
        )

        # --------------------------------------------------------
        # Create audio lookup dictionary
        # --------------------------------------------------------

        for path in flac_files + wav_files:

            audio_id = os.path.splitext(
                os.path.basename(path)
            )[0]

            audio_files[audio_id] = path

        print(
            f"[Dataset] Found "
            f"{len(audio_files)} audio files."
        )

        # ========================================================
        # PARSE PROTOCOL FILES
        # ========================================================

        for protocol_path in protocol_files:

            filename = os.path.basename(
                protocol_path
            ).lower()

            # Only process CM protocol files.
            #
            # Examples:
            # ASVspoof2019.LA.cm.train.trn.txt
            # ASVspoof2019.LA.cm.dev.trl.txt
            # ASVspoof2019.LA.cm.eval.trl.txt

            if "cm" not in filename:

                continue

            # ----------------------------------------------------
            # Determine dataset split
            # ----------------------------------------------------

            if "train" in filename:

                split = "train"

            elif "dev" in filename:

                split = "dev"

            elif "eval" in filename:

                split = "eval"

            else:

                split = "unknown"

            print(
                f"[Dataset] Reading protocol: "
                f"{os.path.basename(protocol_path)} "
                f"-> {split}"
            )

            # ----------------------------------------------------
            # Open protocol
            # ----------------------------------------------------

            try:

                with open(
                    protocol_path,
                    "r",
                    encoding="utf-8"
                ) as file:

                    for line_number, line in enumerate(
                        file,
                        start=1
                    ):

                        line = line.strip()

                        if not line:
                            continue

                        parts = line.split()

                        # ====================================================
                        # ASVSPOOF 2019 LA CM HAS 5 FIELDS
                        #
                        # speaker_id
                        # audio_id
                        # "-"
                        # system_id
                        # label
                        #
                        # Example:
                        #
                        # LA_0079 LA_T_1138241 - A06 spoof
                        #
                        # ====================================================

                        if len(parts) < 5:

                            print(
                                f"[Warning] Invalid protocol "
                                f"line {line_number}: {line}"
                            )

                            continue

                        # ----------------------------------------------------
                        # Extract fields
                        # ----------------------------------------------------

                        speaker_id = parts[0]

                        audio_id = parts[1]

                        system_id = parts[3]

                        label_text = parts[4].lower()

                        # ----------------------------------------------------
                        # Convert label
                        # ----------------------------------------------------

                        if label_text == "bonafide":

                            label = 0

                        elif label_text == "spoof":

                            label = 1

                        else:

                            print(
                                f"[Warning] Unknown label "
                                f"'{label_text}' "
                                f"in {protocol_path}"
                            )

                            continue

                        # ----------------------------------------------------
                        # Find corresponding audio
                        # ----------------------------------------------------

                        if audio_id not in audio_files:

                            continue

                        # ----------------------------------------------------
                        # Add sample
                        # ----------------------------------------------------

                        samples.append(
                            {
                                "file_path":
                                    audio_files[audio_id],

                                "audio_id":
                                    audio_id,

                                "speaker_id":
                                    speaker_id,

                                "system_id":
                                    system_id,

                                "label":
                                    label,

                                "attack_type":
                                    (
                                        system_id
                                        if label == 1
                                        else "bonafide"
                                    ),

                                "split":
                                    split
                            }
                        )

            except Exception as e:

                print(
                    f"[Error] Could not read protocol:"
                )

                print(
                    f"{protocol_path}"
                )

                print(
                    f"Reason: {e}"
                )

        # ========================================================
        # CREATE DATAFRAME
        # ========================================================

        df = pd.DataFrame(
            samples
        )

        if df.empty:

            print(
                "[Dataset] Protocol files were found, "
                "but no matching audio samples were found."
            )

            return df

        # ========================================================
        # REMOVE DUPLICATES
        # ========================================================

        df = df.drop_duplicates(
            subset=["audio_id"]
        ).reset_index(
            drop=True
        )

        # ========================================================
        # DATASET SUMMARY
        # ========================================================

        print("\n")
        print("=" * 60)
        print("ASVSPOOF 2019 DATASET SUMMARY")
        print("=" * 60)

        print(
            f"Total samples : {len(df)}"
        )

        print(
            f"Bonafide      : "
            f"{(df['label'] == 0).sum()}"
        )

        print(
            f"Spoof         : "
            f"{(df['label'] == 1).sum()}"
        )

        # --------------------------------------------------------
        # Split summary
        # --------------------------------------------------------

        if "split" in df.columns:

            print("\nDataset splits:")

            print(
                df["split"]
                .value_counts()
                .to_string()
            )

        # --------------------------------------------------------
        # Attack summary
        # --------------------------------------------------------

        spoof_df = df[
            df["label"] == 1
        ]

        if not spoof_df.empty:

            print(
                "\nSpoof attack/system types:"
            )

            print(
                spoof_df[
                    "attack_type"
                ]
                .value_counts()
                .to_string()
            )

        print("=" * 60)
        print()

        return df

    # ============================================================
    # DIRECTORY-BASED DATASET
    # ============================================================

    def scan_directory_structure(self):
        """
        Scan datasets organized as:

            data/raw/
                genuine/
                spoof/

        or:

            data/raw/
                bonafide/
                spoof/

        or:

            data/raw/
                genuine/
                synthetic/
        """

        samples = []

        genuine_files = []

        spoof_files = []

        # ========================================================
        # GENUINE / BONAFIDE
        # ========================================================

        for folder_name in [
            "genuine",
            "bonafide"
        ]:

            genuine_files.extend(
                glob.glob(
                    os.path.join(
                        self.raw_dir,
                        "**",
                        folder_name,
                        "*.*"
                    ),
                    recursive=True
                )
            )

        # ========================================================
        # SPOOF / SYNTHETIC
        # ========================================================

        for folder_name in [
            "spoof",
            "synthetic"
        ]:

            spoof_files.extend(
                glob.glob(
                    os.path.join(
                        self.raw_dir,
                        "**",
                        folder_name,
                        "*.*"
                    ),
                    recursive=True
                )
            )

        valid_extensions = (
            ".wav",
            ".flac",
            ".mp3",
            ".ogg"
        )

        # ========================================================
        # GENUINE FILES
        # ========================================================

        for path in genuine_files:

            if path.lower().endswith(
                valid_extensions
            ):

                samples.append(
                    {
                        "file_path":
                            path,

                        "label":
                            0,

                        "attack_type":
                            "bonafide"
                    }
                )

        # ========================================================
        # SPOOF FILES
        # ========================================================

        for path in spoof_files:

            if path.lower().endswith(
                valid_extensions
            ):

                samples.append(
                    {
                        "file_path":
                            path,

                        "label":
                            1,

                        "attack_type":
                            "spoof"
                    }
                )

        return pd.DataFrame(
            samples
        )

    # ============================================================
    # DATASET DISCOVERY
    # ============================================================

    def get_dataset(self):
        """
        Automatically discover the dataset.

        Priority:

        1. ASVspoof 2019
        2. Directory-based dataset
        3. Empty DataFrame

        We intentionally do NOT generate fake benchmark
        audio automatically.
        """

        print(
            "\n[Dataset] Searching for ASVspoof 2019..."
        )

        # --------------------------------------------------------
        # Try ASVspoof
        # --------------------------------------------------------

        df_asv = (
            self.scan_asvspoof2019()
        )

        if not df_asv.empty:

            print(
                f"[Dataset] Successfully loaded "
                f"{len(df_asv)} ASVspoof samples."
            )

            return df_asv

        # --------------------------------------------------------
        # Try directory structure
        # --------------------------------------------------------

        print(
            "[Dataset] ASVspoof protocol not found."
        )

        print(
            "[Dataset] Searching for "
            "directory-based dataset..."
        )

        df_dir = (
            self.scan_directory_structure()
        )

        if not df_dir.empty:

            print(
                f"[Dataset] Found "
                f"{len(df_dir)} directory-based samples."
            )

            return df_dir

        # --------------------------------------------------------
        # Nothing found
        # --------------------------------------------------------

        print(
            "[Dataset] ERROR: No valid audio dataset "
            "found inside data/raw."
        )

        return pd.DataFrame()

    # ============================================================
    # FEATURE EXTRACTION
    # ============================================================

    def extract_features_dataset(self, df):
        """
        Extract feature vectors from every audio sample.

        Returns:

            X = feature matrix
            y = labels
        """

        X_list = []

        y_list = []

        # --------------------------------------------------------
        # Validate dataframe
        # --------------------------------------------------------

        if df.empty:

            print(
                "[Dataset] No samples available "
                "for feature extraction."
            )

            return (
                np.empty((0, 0)),
                np.empty((0,))
            )

        # --------------------------------------------------------
        # Start extraction
        # --------------------------------------------------------

        print(
            "\n[Dataset] Extracting features:"
        )

        print(
            "LFCC + MFCC + Prosody + Spectral"
        )

        failed_files = 0

        # ========================================================
        # PROCESS AUDIO
        # ========================================================

        for _, row in tqdm(
            df.iterrows(),
            total=len(df),
            desc="Feature extraction"
        ):

            # ----------------------------------------------------
            # Load and preprocess
            # ----------------------------------------------------

            audio, sr = (
                self.load_and_preprocess_audio(
                    row["file_path"]
                )
            )

            # ----------------------------------------------------
            # Skip failed audio
            # ----------------------------------------------------

            if audio is None:

                failed_files += 1

                continue

            # ----------------------------------------------------
            # Extract features
            # ----------------------------------------------------

            try:

                features = (
                    self.feature_extractor
                    .extract_feature_vector(
                        audio,
                        sr
                    )
                )

                X_list.append(
                    features
                )

                y_list.append(
                    int(row["label"])
                )

            except Exception as e:

                failed_files += 1

                print(
                    f"\n[Warning] Feature extraction "
                    f"failed for:"
                )

                print(
                    row["file_path"]
                )

                print(
                    f"Reason: {e}"
                )

        # ========================================================
        # CONVERT TO NUMPY
        # ========================================================

        X = np.asarray(
            X_list,
            dtype=np.float32
        )

        y = np.asarray(
            y_list,
            dtype=np.int32
        )

        # ========================================================
        # SUMMARY
        # ========================================================

        print("\n")
        print("=" * 60)
        print("FEATURE EXTRACTION SUMMARY")
        print("=" * 60)

        print(
            f"Successful samples : {len(X)}"
        )

        print(
            f"Failed samples     : {failed_files}"
        )

        if len(X) > 0:

            print(
                f"Feature dimensions : {X.shape[1]}"
            )

        print("=" * 60)
        print()

        return X, y