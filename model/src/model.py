"""
TRINETRA - Voice Spoof Detection Model

Features:
- Gradient Boosting classifier
- Random Forest classifier
- MLP classifier
- Extra Trees classifier
- Feature scaling
- Learned decision threshold
- Genuine / Spoof classification
- Spoof risk score
- Persistent model checkpoint
"""

import os
import joblib
import numpy as np

from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
    ExtraTreesClassifier,
)

from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler


class VoiceSpoofDetector:
    """
    Voice spoofing detector.

    Class 0 = Genuine
    Class 1 = Spoof
    """

    def __init__(
        self,
        model_type="gradient_boosting",
        n_estimators=200,
        learning_rate=0.05,
        max_depth=6,
        random_state=42,
        decision_threshold=0.5,
    ):

        self.model_type = model_type
        self.random_state = random_state

        # Learned during validation
        self.decision_threshold = float(
            decision_threshold
        )

        # Feature scaler
        self.scaler = StandardScaler()

        # ------------------------------------------------------------
        # CLASSIFIER
        # ------------------------------------------------------------

        if model_type == "gradient_boosting":

            self.classifier = GradientBoostingClassifier(
                n_estimators=n_estimators,
                learning_rate=learning_rate,
                max_depth=max_depth,
                random_state=random_state,
            )

        elif model_type == "random_forest":

            self.classifier = RandomForestClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                random_state=random_state,
                n_jobs=-1,
            )

        elif model_type == "mlp":

            self.classifier = MLPClassifier(
                hidden_layer_sizes=(128, 64),
                activation="relu",
                max_iter=300,
                random_state=random_state,
            )

        else:

            self.classifier = ExtraTreesClassifier(
                n_estimators=n_estimators,
                random_state=random_state,
                n_jobs=-1,
            )

        self.is_fitted = False

    # ================================================================
    # TRAINING
    # ================================================================

    def fit(self, X, y):
        """
        Fit scaler and classifier.
        """

        X = np.asarray(X)

        y = np.asarray(y)

        # Scale features
        X_scaled = self.scaler.fit_transform(
            X
        )

        # Train classifier
        self.classifier.fit(
            X_scaled,
            y,
        )

        self.is_fitted = True

        return self

    # ================================================================
    # PROBABILITY
    # ================================================================

    def predict_proba(self, X):
        """
        Return:

        [ P(Genuine), P(Spoof) ]
        """

        if not self.is_fitted:

            raise ValueError(
                "Model is not fitted. "
                "Call fit() or load a trained checkpoint."
            )

        X = np.asarray(X)

        X_scaled = self.scaler.transform(
            X
        )

        return self.classifier.predict_proba(
            X_scaled
        )

    # ================================================================
    # THRESHOLD
    # ================================================================

    def set_decision_threshold(
        self,
        threshold,
    ):
        """
        Set decision threshold learned from
        validation data.
        """

        threshold = float(
            threshold
        )

        # Protect against invalid thresholds
        threshold = np.clip(
            threshold,
            0.01,
            0.99,
        )

        self.decision_threshold = float(
            threshold
        )

        print(
            "[Model] Decision threshold set to "
            f"{self.decision_threshold:.4f}"
        )

        return self

    # ================================================================
    # CLASSIFICATION
    # ================================================================

    def classify_probability(
        self,
        p_synthetic,
    ):
        """
        Convert spoof probability into:

        GENUINE
        or
        SPOOF
        """

        if (
            float(p_synthetic)
            >= self.decision_threshold
        ):

            return "SPOOF"

        return "GENUINE"

    # ================================================================
    # RISK SCORE
    # ================================================================

    def calculate_risk_score(
        self,
        feature_vector,
    ):
        """
        Calculate:

        - Genuine probability
        - Spoof probability
        - Risk score
        - Classification
        - Risk level
        - Confidence
        - Evidence
        """

        feature_vector = np.asarray(
            feature_vector
        )

        # Convert single vector -> batch
        if feature_vector.ndim == 1:

            feature_vector = (
                feature_vector.reshape(
                    1,
                    -1,
                )
            )

        # Model probabilities
        probas = self.predict_proba(
            feature_vector
        )[0]

        p_genuine = float(
            probas[0]
        )

        p_synthetic = float(
            probas[1]
        )

        # ------------------------------------------------------------
        # RISK
        # ------------------------------------------------------------

        risk_score = float(
            np.clip(
                p_synthetic * 100.0,
                0.0,
                100.0,
            )
        )

        # ------------------------------------------------------------
        # DECISION
        # ------------------------------------------------------------

        classification = (
            self.classify_probability(
                p_synthetic
            )
        )

        # ------------------------------------------------------------
        # RISK LEVEL
        # ------------------------------------------------------------

        if risk_score < 30:

            risk_level = "LOW"

        elif risk_score < 60:

            risk_level = "MEDIUM"

        elif risk_score < 80:

            risk_level = "HIGH"

        else:

            risk_level = "CRITICAL"

        # ------------------------------------------------------------
        # CONFIDENCE
        # ------------------------------------------------------------

        # Distance from trained decision boundary
        distance = abs(
            p_synthetic
            - self.decision_threshold
        )

        maximum_distance = max(
            self.decision_threshold,
            1.0
            - self.decision_threshold,
            1e-6,
        )

        confidence = float(
            np.clip(
                (
                    distance
                    / maximum_distance
                )
                * 100.0,
                0.0,
                100.0,
            )
        )

        # ------------------------------------------------------------
        # RESPONSE TEXT
        # ------------------------------------------------------------

        if classification == "GENUINE":

            recommendation = (
                "Voice appears genuine. "
                "Continue normal verification."
            )

            evidence = [
                (
                    "Model score is below the "
                    "learned spoof decision threshold."
                ),
                (
                    "Acoustic feature pattern "
                    "is closer to the genuine class."
                ),
            ]

        else:

            recommendation = (
                "Possible synthetic or impersonated "
                "voice. Perform secondary verification."
            )

            evidence = [
                (
                    "Model score is above the "
                    "learned spoof decision threshold."
                ),
                (
                    "Acoustic feature pattern "
                    "is closer to the spoof class."
                ),
            ]

        return {
            "synthetic_probability": round(
                p_synthetic,
                4,
            ),
            "genuine_probability": round(
                p_genuine,
                4,
            ),
            "impersonation_risk_score": round(
                risk_score,
                1,
            ),
            "risk_level": risk_level,
            "classification": classification,
            "decision_threshold": round(
                self.decision_threshold,
                4,
            ),
            "confidence_score": round(
                confidence,
                1,
            ),
            "recommended_action": recommendation,
            "evidence": evidence,
        }

    # ================================================================
    # SAVE
    # ================================================================

    def save(
        self,
        filepath,
    ):
        """
        Save:

        - classifier
        - scaler
        - model configuration
        - fitted state
        - learned decision threshold
        """

        directory = os.path.dirname(
            filepath
        )

        if directory:

            os.makedirs(
                directory,
                exist_ok=True,
            )

        checkpoint = {
            "model_type": self.model_type,
            "classifier": self.classifier,
            "scaler": self.scaler,
            "is_fitted": self.is_fitted,
            "decision_threshold": (
                self.decision_threshold
            ),
        }

        joblib.dump(
            checkpoint,
            filepath,
        )

        print(
            f"[Model] Saved checkpoint to {filepath}"
        )

        print(
            "[Model] Saved decision threshold: "
            f"{self.decision_threshold:.4f}"
        )

    # ================================================================
    # LOAD
    # ================================================================

    @classmethod
    def load(
        cls,
        filepath,
    ):
        """
        Load a trained checkpoint.
        """

        if not os.path.exists(
            filepath
        ):

            raise FileNotFoundError(
                f"Model checkpoint not found: "
                f"{filepath}"
            )

        data = joblib.load(
            filepath
        )

        # Supports both old and new checkpoints
        instance = cls(
            model_type=data.get(
                "model_type",
                "gradient_boosting",
            ),
            decision_threshold=data.get(
                "decision_threshold",
                0.5,
            ),
        )

        instance.classifier = (
            data["classifier"]
        )

        instance.scaler = (
            data["scaler"]
        )

        instance.is_fitted = (
            data.get(
                "is_fitted",
                True,
            )
        )

        instance.decision_threshold = float(
            data.get(
                "decision_threshold",
                0.5,
            )
        )

        print(
            f"[Model] Loaded checkpoint from {filepath}"
        )

        print(
            "[Model] Decision threshold: "
            f"{instance.decision_threshold:.4f}"
        )

        return instance