"""
TRINETRA - Real-Time Single Audio & Chunk Inference Wrapper
Exposes predict_audio_file and predict_audio_buffer for FastAPI backend integration.
"""

import os
import sys
import numpy as np
import soundfile as sf
import librosa

# Add model/src to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from features import AudioFeatureExtractor
from model import VoiceSpoofDetector

_DETECTOR_CACHE = None
_EXTRACTOR_CACHE = None

def get_detector(checkpoint_path="model/checkpoints/voice_spoof_detector.pkl"):
    global _DETECTOR_CACHE, _EXTRACTOR_CACHE
    if _DETECTOR_CACHE is None:
        if os.path.exists(checkpoint_path):
            _DETECTOR_CACHE = VoiceSpoofDetector.load(checkpoint_path)
        else:
            print(f"[Inference Warning] Checkpoint {checkpoint_path} not found. Initializing untrained detector.")
            _DETECTOR_CACHE = VoiceSpoofDetector()
    if _EXTRACTOR_CACHE is None:
        _EXTRACTOR_CACHE = AudioFeatureExtractor(sample_rate=16000)
    return _DETECTOR_CACHE, _EXTRACTOR_CACHE

def predict_audio_file(file_path, checkpoint_path="model/checkpoints/voice_spoof_detector.pkl"):
    """
    Performs inference on a target audio file.
    Returns dictionary with risk_score, risk_level, confidence, evidence, and latency.
    """
    detector, extractor = get_detector(checkpoint_path)
    
    # Load audio
    audio, sr = sf.read(file_path)
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)
    if sr != 16000:
        audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)

    # Extract feature vector
    feat = extractor.extract_feature_vector(audio, sr=16000)
    
    # Compute Risk Score
    result = detector.calculate_risk_score(feat)
    result["file_path"] = file_path
    return result

def predict_audio_buffer(audio_bytes, checkpoint_path="model/checkpoints/voice_spoof_detector.pkl"):
    """Performs inference on an in-memory raw audio byte buffer."""
    import io
    detector, extractor = get_detector(checkpoint_path)
    
    buf = io.BytesIO(audio_bytes)
    audio, sr = sf.read(buf)
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)
    if sr != 16000:
        audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)

    feat = extractor.extract_feature_vector(audio, sr=16000)
    return detector.calculate_risk_score(feat)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="TRINETRA Audio File Predictor")
    parser.add_argument("--audio", type=str, required=True, help="Path to input audio file")
    parser.add_argument("--model", type=str, default="model/checkpoints/voice_spoof_detector.pkl", help="Checkpoint path")
    args = parser.parse_args()

    res = predict_audio_file(args.audio, args.model)
    print("\n" + "=" * 60)
    print("                 TRINETRA DETECTION RESULT")
    print("=" * 60)
    print(f"  File               : {res['file_path']}")
    print(f"  Synthetic Prob     : {res['synthetic_probability']}")
    print(f"  Risk Score         : {res['impersonation_risk_score']} / 100")
    print(f"  Risk Level         : {res['risk_level']}")
    print(f"  Confidence         : {res['confidence_score']}%")
    print(f"  Recommendation     : {res['recommended_action']}")
    print("  Evidence Signals   :")
    for ev in res["evidence"]:
        print(f"    • {ev}")
    print("=" * 60)
