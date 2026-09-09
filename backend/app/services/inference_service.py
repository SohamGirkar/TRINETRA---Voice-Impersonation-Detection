import sys
from pathlib import Path


# Project root
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# Add model/src to Python path
MODEL_SRC = PROJECT_ROOT / "model" / "src"

if str(MODEL_SRC) not in sys.path:
    sys.path.insert(0, str(MODEL_SRC))


from inference import predict_audio_buffer

# Checkpoint path resolution:
# Canonical intended path is model/checkpoints/voice_spoof_detector.pkl,
# but the trained checkpoint in the repository is at model/model/checkpoints/voice_spoof_detector.pkl.
TRAINED_CHECKPOINT = (
    PROJECT_ROOT / "model" / "model" / "checkpoints" / "voice_spoof_detector.pkl"
)
CANONICAL_CHECKPOINT = (
    PROJECT_ROOT / "model" / "checkpoints" / "voice_spoof_detector.pkl"
)

CHECKPOINT_PATH = (
    TRAINED_CHECKPOINT if TRAINED_CHECKPOINT.exists() else CANONICAL_CHECKPOINT
)


class InferenceService:

    def predict(self, audio_bytes: bytes):

        result = predict_audio_buffer(
            audio_bytes,
            checkpoint_path=str(CHECKPOINT_PATH)
        )

        return result


inference_service = InferenceService()