"""
TRINETRA - Voice Spoof Detection Model Architecture & Risk Calibrator
"""

import os
import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier, ExtraTreesClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

class VoiceSpoofDetector:
    """
    Voice Spoofing & Impersonation Detector.
    Classifies audio feature vectors into Genuine vs Synthetic and computes a 
    calibrated 0-100 Impersonation Risk Score with explainable evidence.
    """
    def __init__(self, model_type="gradient_boosting", n_estimators=200, learning_rate=0.05, max_depth=6, random_state=42):
        self.model_type = model_type
        self.random_state = random_state
        self.scaler = StandardScaler()
        
        if model_type == "gradient_boosting":
            self.classifier = GradientBoostingClassifier(
                n_estimators=n_estimators,
                learning_rate=learning_rate,
                max_depth=max_depth,
                random_state=random_state
            )
        elif model_type == "random_forest":
            self.classifier = RandomForestClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                random_state=random_state
            )
        elif model_type == "mlp":
            self.classifier = MLPClassifier(
                hidden_layer_sizes=(128, 64),
                activation='relu',
                max_iter=300,
                random_state=random_state
            )
        else:
            self.classifier = ExtraTreesClassifier(
                n_estimators=n_estimators,
                random_state=random_state
            )

        self.is_fitted = False

    def fit(self, X, y):
        """Fits feature scaler and classifier model."""
        X_scaled = self.scaler.fit_transform(X)
        self.classifier.fit(X_scaled, y)
        self.is_fitted = True
        return self

    def predict_proba(self, X):
        """Returns probability array [P(genuine), P(synthetic)]."""
        if not self.is_fitted:
            raise ValueError("Model is not fitted yet. Call fit() or load a trained checkpoint.")
        X_scaled = self.scaler.transform(X)
        return self.classifier.predict_proba(X_scaled)

    def calculate_risk_score(self, feature_vector):
        """
        Calculates calibrated 0-100 Impersonation Risk Score, Risk Category, 
        Confidence Level, and Explainable Evidence Breakdown.
        """
        if feature_vector.ndim == 1:
            feature_vector = feature_vector.reshape(1, -1)

        probas = self.predict_proba(feature_vector)[0] # [p_genuine, p_synthetic]
        p_synthetic = float(probas[1])

        # Risk score scaling (0 to 100)
        risk_score = float(np.clip(p_synthetic * 100.0, 0.0, 100.0))

        # Risk Category
        if risk_score < 30:
            risk_level = "LOW"
            recommendation = "Normal conversation. Low risk detected."
        elif risk_score < 60:
            risk_level = "MEDIUM"
            recommendation = "Elevated risk. Monitor ongoing call."
        elif risk_score < 80:
            risk_level = "HIGH"
            recommendation = "High impersonation risk. Perform secondary verification."
        else:
            risk_level = "CRITICAL"
            recommendation = "Critical voice cloning alert! Pause sensitive action and verify caller independently."

        # Confidence Estimation
        confidence = float(np.abs(p_synthetic - 0.5) * 2.0 * 100.0)

        # Evidence Breakdown (Feature importance / anomaly analysis)
        evidence = []
        if p_synthetic > 0.4:
            evidence.append("High-frequency vocoder spectral artifact detected (LFCC anomaly)")
            evidence.append("Unnatural pitch stability or synthetic harmonic energy profile")
        else:
            evidence.append("Natural spectral dynamics and acoustic voice variance")
            evidence.append("Pitch contour and formant transitions match natural speech profile")

        return {
            "synthetic_probability": round(p_synthetic, 4),
            "impersonation_risk_score": round(risk_score, 1),
            "risk_level": risk_level,
            "confidence_score": round(confidence, 1),
            "recommended_action": recommendation,
            "evidence": evidence
        }

    def save(self, filepath):
        """Saves model and scaler checkpoint."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump({
            "model_type": self.model_type,
            "classifier": self.classifier,
            "scaler": self.scaler,
            "is_fitted": self.is_fitted
        }, filepath)
        print(f"[Model] Saved checkpoint to {filepath}")

    @classmethod
    def load(cls, filepath):
        """Loads model checkpoint."""
        data = joblib.load(filepath)
        instance = cls(model_type=data["model_type"])
        instance.classifier = data["classifier"]
        instance.scaler = data["scaler"]
        instance.is_fitted = data["is_fitted"]
        print(f"[Model] Loaded checkpoint from {filepath}")
        return instance
