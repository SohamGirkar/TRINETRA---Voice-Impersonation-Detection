"""
TRINETRA - Model Training Pipeline
Trains VoiceSpoofDetector on ASVspoof 2019 / custom audio datasets.
"""

import os
import sys
import yaml
import argparse
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)

# Add model/src to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from features import AudioFeatureExtractor
from dataset import AudioDatasetLoader
from model import VoiceSpoofDetector

def compute_eer(y_true, y_score):
    """Computes Equal Error Rate (EER) for spoof detection."""
    from sklearn.metrics import roc_curve
    fpr, tpr, thresholds = roc_curve(y_true, y_score, pos_label=1)
    fnr = 1 - tpr
    eer_threshold = thresholds[np.nanargmin(np.absolute(fnr - fpr))]
    eer = fpr[np.nanargmin(np.absolute(fnr - fpr))]
    return float(eer), float(eer_threshold)

def main():
    parser = argparse.ArgumentParser(description="Train TRINETRA Voice Spoof Detector")
    parser.add_argument("--config", type=str, default="model/configs/baseline.yaml", help="Path to config yaml")
    parser.add_argument("--raw_dir", type=str, default="data/raw", help="Path to raw dataset directory")
    parser.add_argument("--output_model", type=str, default="model/checkpoints/voice_spoof_detector.pkl", help="Output model path")
    args = parser.parse_args()

    # Load YAML config
    if os.path.exists(args.config):
        with open(args.config, "r") as f:
            config = yaml.safe_load(f)
    else:
        config = {
            "audio": {"target_sample_rate": 16000, "duration_sec": 3.0},
            "model": {"type": "gradient_boosting", "n_estimators": 200, "learning_rate": 0.05, "max_depth": 6}
        }

    print("=" * 60)
    print("      TRINETRA - AI VOICE IMPERSONATION DETECTION MODEL TRAINING")
    print("=" * 60)

    # 1. Feature Extractor & Dataset Loader
    feature_extractor = AudioFeatureExtractor(
        sample_rate=config["audio"].get("target_sample_rate", 16000)
    )
    loader = AudioDatasetLoader(
        raw_dir=args.raw_dir,
        sample_rate=config["audio"].get("target_sample_rate", 16000),
        duration_sec=config["audio"].get("duration_sec", 3.0),
        feature_extractor=feature_extractor
    )

    # 2. Load Dataset Dataframe
    df = loader.get_dataset()
    print(f"[Dataset] Total samples: {len(df)} (Genuine: {sum(df['label']==0)}, Synthetic: {sum(df['label']==1)})")

    # 3. Feature Extraction
    X, y = loader.extract_features_dataset(df)
    print(f"[Features] Feature matrix shape: {X.shape}")

    # 4. Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 5. Model Initialization & Training
    print("[Training] Training VoiceSpoofDetector model...")
    model_cfg = config.get("model", {})
    detector = VoiceSpoofDetector(
        model_type=model_cfg.get("type", "gradient_boosting"),
        n_estimators=model_cfg.get("n_estimators", 200),
        learning_rate=model_cfg.get("learning_rate", 0.05),
        max_depth=model_cfg.get("max_depth", 6),
        random_state=42
    )
    detector.fit(X_train, y_train)

    # 6. Evaluation Metrics
    probas = detector.predict_proba(X_test)[:, 1]
    preds = (probas >= 0.5).astype(int)

    acc = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds, zero_division=0)
    rec = recall_score(y_test, preds, zero_division=0)
    f1 = f1_score(y_test, preds, zero_division=0)
    roc_auc = roc_auc_score(y_test, probas)
    eer, eer_threshold = compute_eer(y_test, probas)
    cm = confusion_matrix(y_test, preds)

    print("\n" + "=" * 60)
    print("                    EVALUATION RESULTS")
    print("=" * 60)
    print(f"  Accuracy Score   : {acc * 100:.2f}%")
    print(f"  Precision        : {prec * 100:.2f}%")
    print(f"  Recall           : {rec * 100:.2f}%")
    print(f"  F1 Score         : {f1 * 100:.2f}%")
    print(f"  ROC-AUC Score    : {roc_auc:.4f}")
    print(f"  Equal Error Rate : {eer * 100:.2f}% (Threshold: {eer_threshold:.4f})")
    print("\nConfusion Matrix:")
    print(f"  [ Genuine True: {cm[0,0]}  | Genuine -> Spoof False Pos: {cm[0,1]} ]")
    print(f"  [ Spoof -> Genuine False Neg: {cm[1,0]} | Spoof True: {cm[1,1]} ]")
    print("=" * 60)

    # 7. Save Checkpoint
    detector.save(args.output_model)
    print(f"\n[Success] Model training complete! Saved to: {args.output_model}")

if __name__ == "__main__":
    main()
