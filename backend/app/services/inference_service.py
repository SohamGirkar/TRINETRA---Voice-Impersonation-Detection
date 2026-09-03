import sys
from pathlib import Path


# Project root
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# Add model/src to Python path
MODEL_SRC = PROJECT_ROOT / "model" / "src"

if str(MODEL_SRC) not in sys.path:
    sys.path.insert(0, str(MODEL_SRC))


from inference import predict_audio_buffer


class InferenceService:

    def predict(self, audio_bytes: bytes):

        result = predict_audio_buffer(
            audio_bytes,
            checkpoint_path=str(
                PROJECT_ROOT
                / "model"
                / "checkpoints"
                / "voice_spoof_detector.pkl"
            )
        )

        return result


inference_service = InferenceService()