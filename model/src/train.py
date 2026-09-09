"""
TRINETRA - Model Training Pipeline

Training data:
- ASVspoof 2019 genuine + spoof
- Common Voice spontaneous human speech

Pipeline:
1. Load datasets
2. Use ASVspoof train recordings for training
3. Use ASVspoof dev recordings for validation
4. Add Common Voice genuine recordings to training
5. Balance training classes
6. Convert recordings into overlapping 3-second chunks
7. Train classifier
8. Learn decision threshold from ASVspoof dev
9. Save model + threshold
"""

import os
import sys
import yaml
import argparse
import numpy as np
import pandas as pd

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    roc_curve,
)

# Add model/src to Python path
sys.path.append(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

from features import AudioFeatureExtractor
from dataset import AudioDatasetLoader
from model import VoiceSpoofDetector


# ================================================================
# EER
# ================================================================

def compute_eer(y_true, y_score):
    """
    Compute Equal Error Rate.
    """

    fpr, tpr, thresholds = roc_curve(
        y_true,
        y_score,
        pos_label=1,
    )

    fnr = 1.0 - tpr

    index = np.nanargmin(
        np.abs(fnr - fpr)
    )

    eer = fpr[index]
    eer_threshold = thresholds[index]

    return float(eer), float(eer_threshold)


# ================================================================
# SPLIT ASVSPOOF BY OFFICIAL SET
# ================================================================

def split_asvspoof_sets(df):
    """
    Identify ASVspoof train/dev/eval recordings from audio IDs.
    """

    if "audio_id" not in df.columns:
        return None, None, None

    audio_ids = (
        df["audio_id"]
        .astype(str)
        .str.upper()
    )

    train_mask = audio_ids.str.startswith(
        "LA_T_"
    )

    dev_mask = audio_ids.str.startswith(
        "LA_D_"
    )

    eval_mask = audio_ids.str.startswith(
        "LA_E_"
    )

    train_df = df[
        train_mask
    ].copy()

    dev_df = df[
        dev_mask
    ].copy()

    eval_df = df[
        eval_mask
    ].copy()

    return (
        train_df,
        dev_df,
        eval_df,
    )


# ================================================================
# MAIN
# ================================================================

def main():

    parser = argparse.ArgumentParser(
        description=(
            "Train TRINETRA Voice Spoof Detector"
        )
    )

    parser.add_argument(
        "--config",
        type=str,
        default=(
            "model/configs/"
            "baseline.yaml"
        ),
    )

    parser.add_argument(
        "--raw_dir",
        type=str,
        default="data/raw",
    )

    parser.add_argument(
        "--output_model",
        type=str,
        default=(
            "model/checkpoints/"
            "voice_spoof_detector.pkl"
        ),
    )

    args = parser.parse_args()

    # ============================================================
    # CONFIG
    # ============================================================

    if os.path.exists(args.config):

        with open(
            args.config,
            "r",
            encoding="utf-8",
        ) as file:

            config = yaml.safe_load(
                file
            )

    else:

        config = {
            "audio": {
                "target_sample_rate": 16000,
                "duration_sec": 3.0,
            },
            "model": {
                "type": "gradient_boosting",
                "n_estimators": 200,
                "learning_rate": 0.05,
                "max_depth": 6,
            },
        }

    print("=" * 70)
    print(
        "TRINETRA - VOICE IMPERSONATION "
        "DETECTION TRAINING"
    )
    print("=" * 70)

    # ============================================================
    # FEATURE EXTRACTOR + DATASET LOADER
    # ============================================================

    sample_rate = config[
        "audio"
    ].get(
        "target_sample_rate",
        16000,
    )

    duration_sec = config[
        "audio"
    ].get(
        "duration_sec",
        3.0,
    )

    feature_extractor = (
        AudioFeatureExtractor(
            sample_rate=sample_rate
        )
    )

    loader = AudioDatasetLoader(
        raw_dir=args.raw_dir,
        sample_rate=sample_rate,
        duration_sec=duration_sec,
        feature_extractor=feature_extractor,
        chunk_hop_sec=1.5,
    )

    # ============================================================
    # LOAD COMBINED DATASET
    # ============================================================

    df = loader.get_dataset()

    print()
    print(
        f"[Dataset] Total recordings: "
        f"{len(df)}"
    )

    print(
        f"[Dataset] Genuine: "
        f"{int((df['label'] == 0).sum())}"
    )

    print(
        f"[Dataset] Spoof: "
        f"{int((df['label'] == 1).sum())}"
    )

    # ============================================================
    # SEPARATE SOURCES
    # ============================================================

    asv_df = df[
        df["source"] == "asvspoof"
    ].copy()

    cv_df = df[
        df["source"] == "common_voice"
    ].copy()

    custom_df = df[
        df["source"] == "custom"
    ].copy()

    print()
    print(
        "[Sources]"
    )

    print(
        f"  ASVspoof     : "
        f"{len(asv_df)}"
    )

    print(
        f"  Common Voice : "
        f"{len(cv_df)}"
    )

    print(
        f"  Custom       : "
        f"{len(custom_df)}"
    )

    # ============================================================
    # OFFICIAL ASVSPOOF SPLIT
    # ============================================================

    asv_train, asv_dev, asv_eval = (
        split_asvspoof_sets(
            asv_df
        )
    )

    if (
        asv_train is None
        or len(asv_train) == 0
        or len(asv_dev) == 0
    ):

        raise RuntimeError(
            "Could not identify ASVspoof "
            "train/dev sets."
        )

    print()
    print(
        "[ASVspoof Split]"
    )

    print(
        f"  Train: "
        f"{len(asv_train)}"
    )

    print(
        f"  Dev  : "
        f"{len(asv_dev)}"
    )

    print(
        f"  Eval : "
        f"{len(asv_eval)}"
    )

    # ============================================================
    # ASVSPOOF TRAIN BALANCING
    # ============================================================

    asv_train_genuine = (
        asv_train[
            asv_train["label"] == 0
        ]
    )

    asv_train_spoof = (
        asv_train[
            asv_train["label"] == 1
        ]
    )

    print()
    print(
        "[ASVspoof] Balancing train set..."
    )

    n_asv = min(
        len(asv_train_genuine),
        len(asv_train_spoof),
    )

    asv_train_genuine = (
        asv_train_genuine.sample(
            n=n_asv,
            random_state=42,
        )
    )

    asv_train_spoof = (
        asv_train_spoof.sample(
            n=n_asv,
            random_state=42,
        )
    )

    balanced_asv_train = pd.concat(
        [
            asv_train_genuine,
            asv_train_spoof,
        ],
        ignore_index=True,
    )

    # ============================================================
    # COMMON VOICE SELECTION
    # ============================================================

    #
    # Common Voice contains ONLY genuine recordings.
    #
    # We deliberately keep a controlled subset so that:
    # - ASVspoof still teaches spoof detection
    # - Common Voice teaches the model how real-world
    #   spontaneous speech looks
    #

    max_common_voice = min(
        10000,
        len(cv_df),
    )

    if max_common_voice > 0:

        cv_train = cv_df.sample(
            n=max_common_voice,
            random_state=42,
        )

    else:

        cv_train = cv_df

    print()
    print(
        "[Common Voice]"
    )

    print(
        f"  Genuine recordings used: "
        f"{len(cv_train)}"
    )

    # ============================================================
    # COMBINE TRAINING DATA
    # ============================================================

    train_recordings = pd.concat(
        [
            balanced_asv_train,
            cv_train,
        ],
        ignore_index=True,
    )

    train_recordings = (
        train_recordings
        .sample(
            frac=1,
            random_state=42,
        )
        .reset_index(
            drop=True
        )
    )

    print()
    print(
        "[Training Recordings]"
    )

    print(
        f"  Total: "
        f"{len(train_recordings)}"
    )

    print(
        f"  Genuine: "
        f"{int((train_recordings['label'] == 0).sum())}"
    )

    print(
        f"  Spoof: "
        f"{int((train_recordings['label'] == 1).sum())}"
    )

    # ============================================================
    # FEATURE EXTRACTION - TRAIN
    # ============================================================

    print()
    print(
        "[Training] Extracting features..."
    )

    X_train, y_train = (
        loader.extract_features_dataset(
            train_recordings,
            max_chunks_per_file=2,
            common_voice_max_files=10000,
        )
    )

    # ============================================================
    # FEATURE EXTRACTION - VALIDATION
    # ============================================================

    print()
    print(
        "[Validation] Extracting ASVspoof dev features..."
    )

    X_dev, y_dev = (
        loader.extract_features_dataset(
            asv_dev,
            max_chunks_per_file=2,
            common_voice_max_files=0,
        )
    )

    print()
    print(
        f"[Features] Train shape: "
        f"{X_train.shape}"
    )

    print(
        f"[Features] Dev shape: "
        f"{X_dev.shape}"
    )

    print()
    print(
        "[Features] Training labels:"
    )

    print(
        f"  Genuine: "
        f"{int(np.sum(y_train == 0))}"
    )

    print(
        f"  Spoof  : "
        f"{int(np.sum(y_train == 1))}"
    )

    # ============================================================
    # MODEL
    # ============================================================

    model_cfg = config.get(
        "model",
        {},
    )

    detector = VoiceSpoofDetector(
        model_type=model_cfg.get(
            "type",
            "gradient_boosting",
        ),
        n_estimators=model_cfg.get(
            "n_estimators",
            200,
        ),
        learning_rate=model_cfg.get(
            "learning_rate",
            0.05,
        ),
        max_depth=model_cfg.get(
            "max_depth",
            6,
        ),
        random_state=model_cfg.get(
            "random_state",
            42,
        ),
    )

    print()
    print(
        "[Training] Training classifier..."
    )

    detector.fit(
        X_train,
        y_train,
    )

    # ============================================================
    # VALIDATION
    # ============================================================

    print()
    print(
        "[Validation] Running predictions..."
    )

    dev_probas = (
        detector.predict_proba(
            X_dev
        )[:, 1]
    )

    # Learn threshold ONLY from validation data
    eer, eer_threshold = compute_eer(
        y_dev,
        dev_probas,
    )

    detector.set_decision_threshold(
        eer_threshold
    )

    dev_preds = (
        dev_probas
        >= detector.decision_threshold
    ).astype(int)

    accuracy = accuracy_score(
        y_dev,
        dev_preds,
    )

    precision = precision_score(
        y_dev,
        dev_preds,
        zero_division=0,
    )

    recall = recall_score(
        y_dev,
        dev_preds,
        zero_division=0,
    )

    f1 = f1_score(
        y_dev,
        dev_preds,
        zero_division=0,
    )

    roc_auc = roc_auc_score(
        y_dev,
        dev_probas,
    )

    cm = confusion_matrix(
        y_dev,
        dev_preds,
        labels=[0, 1],
    )

    # ============================================================
    # RESULTS
    # ============================================================

    print()
    print("=" * 70)
    print(
        "                    VALIDATION RESULTS"
    )
    print("=" * 70)

    print(
        f"  Accuracy Score     : "
        f"{accuracy * 100:.2f}%"
    )

    print(
        f"  Precision          : "
        f"{precision * 100:.2f}%"
    )

    print(
        f"  Recall             : "
        f"{recall * 100:.2f}%"
    )

    print(
        f"  F1 Score           : "
        f"{f1 * 100:.2f}%"
    )

    print(
        f"  ROC-AUC Score      : "
        f"{roc_auc:.4f}"
    )

    print(
        f"  Equal Error Rate   : "
        f"{eer * 100:.2f}%"
    )

    print(
        f"  Decision Threshold : "
        f"{detector.decision_threshold:.4f}"
    )

    print()
    print(
        "Confusion Matrix:"
    )

    print(
        f"  [ Genuine True     : "
        f"{cm[0, 0]:6d} ]"
    )

    print(
        f"  [ Genuine -> Spoof : "
        f"{cm[0, 1]:6d} ]"
    )

    print(
        f"  [ Spoof -> Genuine : "
        f"{cm[1, 0]:6d} ]"
    )

    print(
        f"  [ Spoof True       : "
        f"{cm[1, 1]:6d} ]"
    )

    print("=" * 70)

    # ============================================================
    # SAVE
    # ============================================================

    output_dir = os.path.dirname(
        args.output_model
    )

    if output_dir:
        os.makedirs(
            output_dir,
            exist_ok=True,
        )

    detector.save(
        args.output_model
    )

    print()
    print(
        "[Success] Training complete."
    )

    print(
        f"[Success] Model saved to: "
        f"{args.output_model}"
    )

    print(
        f"[Success] Threshold saved: "
        f"{detector.decision_threshold:.4f}"
    )


if __name__ == "__main__":
    main()