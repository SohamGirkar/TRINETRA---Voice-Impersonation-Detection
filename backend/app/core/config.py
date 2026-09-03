from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent

MODEL_PATH = PROJECT_ROOT / "model" / "checkpoints" / "voice_spoof_detector.pkl"

SAMPLE_RATE = 16000
MAX_FILE_SIZE_MB = 25