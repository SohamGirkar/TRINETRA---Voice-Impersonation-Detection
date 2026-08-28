
"""
TRINETRA - ASVspoof 2019 Training Pipeline

Training strategy:

    ASVspoof TRAIN → Model Training
    ASVspoof DEV   → Validation
    ASVspoof EVAL  → Final Evaluation

Labels:
    0 = bonafide
    1 = spoof
"""

import os
import sys
import yaml
import argparse
import numpy as np

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    roc_curve
)

# ------------------------------------------------------------
# Add model/src to Python path
# ------------------------------------------------------------

CURRENT_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

sys.path.append(CURRENT_DIR)

from features import AudioFeatureExtractor
from dataset import AudioDatasetLoader
from model import VoiceSpoofDetector


# ============================================================
# EER CALCULATION
# ============================================================

def compute_eer(y_true, y_score):
    """
    Calculate Equal Error Rate (EER).

    EER is the point where:

        False Positive Rate ≈ False Negative Rate
    """

    fpr, tpr, thresholds = roc_curve(
        y_true,
        y_score,
        pos_label=1
    )

    fnr = 1.0 - tpr

    difference = np.abs(
        fpr - fnr
    )

    index = np.nanargmin(
        difference
    )

    eer = (fpr[index] + fnr[index]) / 2.0

    threshold = thresholds[index]

    return float(eer), float(threshold)


# ============================================================
# DATASET PROCESSING
# ============================================================

def prepare_split(
    loader,
    df,
    split_name
):
    """
    Extract features only from one dataset split.
    """

    split_df = df[
        df["split"] == split_name
    ].copy()

    if split_df.empty:

        raise ValueError(
            f"No samples found for split: {split_name}"
        )

    print("\n" + "=" * 60)

    print(
        f"PROCESSING {split_name.upper()} DATASET"
    )

    print("=" * 60)

    print(
        f"Total samples: {len(split_df)}"
    )

    print(
        f"Bonafide: "
        f"{(split_df['label'] == 0).sum()}"
    )

    print(
        f"Spoof: "
        f"{(split_df['label'] == 1).sum()}"
    )

    X, y = loader.extract_features_dataset(
        split_df
    )

    print(
        f"Feature matrix: {X.shape}"
    )

    return X, y


# ============================================================
# EVALUATION
# ============================================================

def evaluate_model(
    detector,
    X,
    y,
    dataset_name
):
    """
    Evaluate the detector using multiple metrics.
    """

    print("\n" + "=" * 60)

    print(
        f"{dataset_name.upper()} EVALUATION"
    )

    print("=" * 60)

    # --------------------------------------------------------
    # Prediction probabilities
    # --------------------------------------------------------

    probabilities = (
        detector.predict_proba(X)[:, 1]
    )

    # --------------------------------------------------------
    # Convert probability → class
    # --------------------------------------------------------

    predictions = (
        probabilities >= 0.5
    ).astype(int)

    # --------------------------------------------------------
    # Metrics
    # --------------------------------------------------------

    accuracy = accuracy_score(
        y,
        predictions
    )

    precision = precision_score(
        y,
        predictions,
        zero_division=0
    )

    recall = recall_score(
        y,
        predictions,
        zero_division=0
    )

    f1 = f1_score(
        y,
        predictions,
        zero_division=0
    )

    roc_auc = roc_auc_score(
        y,
        probabilities
    )

    eer, eer_threshold = compute_eer(
        y,
        probabilities
    )

    cm = confusion_matrix(
        y,
        predictions
    )

    # --------------------------------------------------------
    # Print results
    # --------------------------------------------------------

    print(
        f"Accuracy       : {accuracy * 100:.2f}%"
    )

    print(
        f"Precision      : {precision * 100:.2f}%"
    )

    print(
        f"Recall         : {recall * 100:.2f}%"
    )

    print(
        f"F1 Score       : {f1 * 100:.2f}%"
    )

    print(
        f"ROC-AUC        : {roc_auc:.4f}"
    )

    print(
        f"EER            : {eer * 100:.2f}%"
    )

    print(
        f"EER Threshold  : {eer_threshold:.4f}"
    )

    # --------------------------------------------------------
    # Confusion matrix
    # --------------------------------------------------------

    print("\nConfusion Matrix:")

    print(
        "                  Predicted"
    )

    print(
        "              Bonafide  Spoof"
    )

    print(
        f"Actual Bonafide  "
        f"{cm[0, 0]:8d}  "
        f"{cm[0, 1]:5d}"
    )

    print(
        f"Actual Spoof     "
        f"{cm[1, 0]:8d}  "
        f"{cm[1, 1]:5d}"
    )

    print("=" * 60)

    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "roc_auc": roc_auc,
        "eer": eer,
        "eer_threshold": eer_threshold,
        "confusion_matrix": cm
    }


# ============================================================
# MAIN TRAINING PIPELINE
# ============================================================

def main():

    # --------------------------------------------------------
    # Command-line arguments
    # --------------------------------------------------------

    parser = argparse.ArgumentParser(
        description=(
            "Train TRINETRA on "
            "ASVspoof 2019"
        )
    )

    parser.add_argument(
        "--config",
        type=str,
        default="model/configs/baseline.yaml",
        help="Path to YAML configuration"
    )

    parser.add_argument(
        "--raw_dir",
        type=str,
        default="data/raw",
        help="Path to ASVspoof dataset"
    )

    parser.add_argument(
        "--output_model",
        type=str,
        default=(
            "model/checkpoints/"
            "voice_spoof_detector.pkl"
        ),
        help="Output model checkpoint"
    )

    args = parser.parse_args()

    # --------------------------------------------------------
    # Load configuration
    # --------------------------------------------------------

    if os.path.exists(args.config):

        print(
            f"[Config] Loading: "
            f"{args.config}"
        )

        with open(
            args.config,
            "r",
            encoding="utf-8"
        ) as file:

            config = yaml.safe_load(file)

    else:

        print(
            "[Config] Configuration file "
            "not found. Using defaults."
        )

        config = {
            "audio": {
                "target_sample_rate": 16000,
                "duration_sec": 3.0
            },

            "model": {
                "type": "gradient_boosting",
                "n_estimators": 200,
                "learning_rate": 0.05,
                "max_depth": 6
            }
        }

    # --------------------------------------------------------
    # Configuration values
    # --------------------------------------------------------

    sample_rate = config[
        "audio"
    ].get(
        "target_sample_rate",
        16000
    )

    duration = config[
        "audio"
    ].get(
        "duration_sec",
        3.0
    )

    model_config = config.get(
        "model",
        {}
    )

    # --------------------------------------------------------
    # Header
    # --------------------------------------------------------

    print("\n")

    print("=" * 60)

    print(
        "TRINETRA"
    )

    print(
        "AI VOICE IMPERSONATION DETECTION"
    )

    print(
        "ASVSPOOF 2019 TRAINING PIPELINE"
    )

    print("=" * 60)

    print(
        f"Sample Rate : {sample_rate} Hz"
    )

    print(
        f"Duration    : {duration} seconds"
    )

    print(
        f"Model       : "
        f"{model_config.get('type', 'gradient_boosting')}"
    )

    print("=" * 60)

    # ========================================================
    # 1. FEATURE EXTRACTOR
    # ========================================================

    print(
        "\n[1/6] Initializing feature extractor..."
    )

    feature_extractor = AudioFeatureExtractor(
        sample_rate=sample_rate
    )

    # ========================================================
    # 2. DATASET LOADER
    # ========================================================

    print(
        "[2/6] Loading ASVspoof dataset..."
    )

    loader = AudioDatasetLoader(
        raw_dir=args.raw_dir,
        sample_rate=sample_rate,
        duration_sec=duration,
        feature_extractor=feature_extractor
    )

    df = loader.get_dataset()

    # --------------------------------------------------------
    # Make sure dataset exists
    # --------------------------------------------------------

    if df.empty:

        raise RuntimeError(
            "No dataset found. "
            "Check data/raw/ASVspoof2019."
        )

    # --------------------------------------------------------
    # Make sure official splits exist
    # --------------------------------------------------------

    if "split" not in df.columns:

        raise RuntimeError(
            "Dataset does not contain "
            "train/dev/eval split information."
        )

    # ========================================================
    # 3. PREPARE TRAINING DATA
    # ========================================================

    print(
        "\n[3/6] Preparing training data..."
    )

    X_train, y_train = prepare_split(
        loader,
        df,
        "train"
    )

    # ========================================================
    # 4. PREPARE DEVELOPMENT DATA
    # ========================================================

    print(
        "\n[4/6] Preparing development data..."
    )

    X_dev, y_dev = prepare_split(
        loader,
        df,
        "dev"
    )

    # ========================================================
    # 5. TRAIN MODEL
    # ========================================================

    print(
        "\n[5/6] Training TRINETRA model..."
    )

    detector = VoiceSpoofDetector(

        model_type=model_config.get(
            "type",
            "gradient_boosting"
        ),

        n_estimators=model_config.get(
            "n_estimators",
            200
        ),

        learning_rate=model_config.get(
            "learning_rate",
            0.05
        ),

        max_depth=model_config.get(
            "max_depth",
            6
        ),

        random_state=42
    )

    detector.fit(
        X_train,
        y_train
    )

    print(
        "\n[Training] Model training complete."
    )

    # --------------------------------------------------------
    # Development evaluation
    # --------------------------------------------------------

    evaluate_model(
        detector,
        X_dev,
        y_dev,
        "Development"
    )

    # ========================================================
    # 6. FINAL EVALUATION
    # ========================================================

    print(
        "\n[6/6] Preparing final evaluation..."
    )

    X_eval, y_eval = prepare_split(
        loader,
        df,
        "eval"
    )

    final_results = evaluate_model(
        detector,
        X_eval,
        y_eval,
        "Final ASVspoof Evaluation"
    )

    # ========================================================
    # SAVE MODEL
    # ========================================================

    print(
        "\n[Model] Saving checkpoint..."
    )

    detector.save(
        args.output_model
    )

    # ========================================================
    # FINAL SUMMARY
    # ========================================================

    print("\n")

    print("=" * 60)

    print(
        "TRINETRA TRAINING COMPLETE"
    )

    print("=" * 60)

    print(
        f"Final Accuracy : "
        f"{final_results['accuracy'] * 100:.2f}%"
    )

    print(
        f"Final F1       : "
        f"{final_results['f1'] * 100:.2f}%"
    )

    print(
        f"Final ROC-AUC  : "
        f"{final_results['roc_auc']:.4f}"
    )

    print(
        f"Final EER      : "
        f"{final_results['eer'] * 100:.2f}%"
    )

    print(
        f"\nModel saved to:"
    )

    print(
        args.output_model
    )

    print("=" * 60)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()

