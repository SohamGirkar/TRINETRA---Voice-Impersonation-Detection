

import os
import sys
import io

import numpy as np
import soundfile as sf
import librosa


# Add model/src to Python path
sys.path.append(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

from features import AudioFeatureExtractor
from model import VoiceSpoofDetector


# ----------------------------------------------------------------------
# GLOBAL CACHE
# ----------------------------------------------------------------------

_DETECTOR_CACHE = None
_EXTRACTOR_CACHE = None


# ----------------------------------------------------------------------
# MODEL LOADER
# ----------------------------------------------------------------------

def get_detector(
    checkpoint_path=(
        "model/checkpoints/"
        "voice_spoof_detector.pkl"
    )
):
    """
    Load detector and feature extractor once.
    """

    global _DETECTOR_CACHE
    global _EXTRACTOR_CACHE

    if _DETECTOR_CACHE is None:

        if not os.path.exists(
            checkpoint_path
        ):

            raise FileNotFoundError(
                f"Model checkpoint not found: "
                f"{checkpoint_path}"
            )

        _DETECTOR_CACHE = (
            VoiceSpoofDetector.load(
                checkpoint_path
            )
        )

    if _EXTRACTOR_CACHE is None:

        _EXTRACTOR_CACHE = (
            AudioFeatureExtractor(
                sample_rate=16000
            )
        )

    return (
        _DETECTOR_CACHE,
        _EXTRACTOR_CACHE,
    )


# ----------------------------------------------------------------------
# AUDIO PREPARATION
# ----------------------------------------------------------------------

def prepare_audio(audio, sr):
    """
    Apply the same basic preprocessing used during training.
    """

    # Stereo -> mono
    if audio.ndim > 1:
        audio = np.mean(
            audio,
            axis=1,
        )

    audio = audio.astype(
        np.float32
    )

    # Resample
    if sr != 16000:

        audio = librosa.resample(
            audio,
            orig_sr=sr,
            target_sr=16000,
        )

    # Peak normalization
    peak = (
        float(
            np.max(
                np.abs(audio)
            )
        )
        if len(audio) > 0
        else 0.0
    )

    if peak > 0:
        audio = audio / peak

    # Silence trimming
    intervals = librosa.effects.split(
        audio,
        top_db=40,
    )

    if len(intervals) > 0:

        audio = np.concatenate(
            [
                audio[start:end]
                for start, end in intervals
            ]
        )

    return audio


# ----------------------------------------------------------------------
# CHUNK GENERATION
# ----------------------------------------------------------------------

def make_chunks(
    audio,
    chunk_sec=3.0,
    hop_sec=1.5,
):
    """
    Create overlapping 3-second chunks.

    Example for longer audio:

    chunk 1 = 0.0 - 3.0
    chunk 2 = 1.5 - 4.5
    chunk 3 = 3.0 - 6.0
    ...
    """

    chunk_length = int(
        16000 * chunk_sec
    )

    hop_length = max(
        1,
        int(
            16000 * hop_sec
        ),
    )

    # Empty audio safety
    if len(audio) == 0:

        return [
            np.zeros(
                chunk_length,
                dtype=np.float32,
            )
        ]

    # Short audio
    if len(audio) <= chunk_length:

        if len(audio) < chunk_length:

            audio = np.pad(
                audio,
                (
                    0,
                    chunk_length - len(audio),
                ),
                mode="constant",
            )

        return [
            audio.astype(
                np.float32
            )
        ]

    chunks = []

    # Overlapping chunks
    for start in range(
        0,
        len(audio) - chunk_length + 1,
        hop_length,
    ):

        chunks.append(
            audio[
                start:start + chunk_length
            ].astype(np.float32)
        )

    # Final chunk
    final_chunk = audio[
        -chunk_length:
    ].astype(np.float32)

    if not np.array_equal(
        final_chunk,
        chunks[-1],
    ):

        chunks.append(
            final_chunk
        )

    return chunks


# ----------------------------------------------------------------------
# RESULT CREATION
# ----------------------------------------------------------------------

def create_result(
    chunk_scores,
):
    """
    Aggregate chunk predictions into one final result.
    """

    scores = np.asarray(
        chunk_scores,
        dtype=np.float32,
    )

    if len(scores) == 0:
        raise ValueError(
            "No chunk predictions available."
        )

    # Median is more robust than mean when
    # one segment contains noise or bad audio.
    final_probability = float(
        np.median(scores)
    )

    # Convert probability to 0-100 risk score.
    risk_score = (
        final_probability * 100.0
    )

    # Risk bands
    if risk_score < 30:

        risk_level = "LOW"

        recommendation = (
            "Voice appears genuine."
        )

    elif risk_score < 60:

        risk_level = "MEDIUM"

        recommendation = (
            "Voice requires additional verification."
        )

    elif risk_score < 80:

        risk_level = "HIGH"

        recommendation = (
            "Possible synthetic or impersonated voice."
        )

    else:

        risk_level = "CRITICAL"

        recommendation = (
            "Strong evidence of synthetic "
            "or impersonated voice."
        )

    # Probability-based confidence.
    confidence = abs(
        final_probability - 0.5
    ) * 200.0

    return {
        "synthetic_probability": round(
            final_probability,
            4,
        ),

        "impersonation_risk_score": round(
            risk_score,
            2,
        ),

        "risk_level": risk_level,

        "confidence_score": round(
            confidence,
            2,
        ),

        "recommended_action": recommendation,

        "evidence": [
            (
                f"Analyzed "
                f"{len(scores)} "
                f"independent 3-second "
                f"audio segments."
            ),

            (
                "Chunk spoof scores: "
                f"{[round(float(x), 4) for x in scores]}"
            ),

            (
                "Final score uses the "
                "median of all chunk predictions."
            ),
        ],

        "chunk_scores": [
            round(
                float(score) * 100.0,
                2,
            )
            for score in scores
        ],
    }


# ----------------------------------------------------------------------
# BUFFER INFERENCE
# ----------------------------------------------------------------------

def predict_audio_buffer(
    audio_bytes,
    checkpoint_path=(
        "model/checkpoints/"
        "voice_spoof_detector.pkl"
    ),
):
    """
    Run spoof detection on an in-memory audio file.
    """

    detector, extractor = (
        get_detector(
            checkpoint_path
        )
    )

    # Decode audio
    buffer = io.BytesIO(
        audio_bytes
    )

    audio, sr = sf.read(
        buffer
    )

    # Prepare audio
    audio = prepare_audio(
        audio,
        sr,
    )

    # Create 3-second chunks
    chunks = make_chunks(
        audio,
        chunk_sec=3.0,
        hop_sec=1.5,
    )

    chunk_scores = []

    # Predict each chunk separately
    for index, chunk in enumerate(
        chunks
    ):

        features = (
            extractor.extract_feature_vector(
                chunk,
                sr=16000,
            )
        )

        probability = float(
            detector.predict_proba(
                features.reshape(
                    1,
                    -1,
                )
            )[0, 1]
        )

        chunk_scores.append(
            probability
        )

        print(
            f"[Inference] Chunk "
            f"{index + 1}/{len(chunks)} "
            f"spoof probability: "
            f"{probability:.4f}"
        )

    # Aggregate
    result = create_result(
        chunk_scores
    )

    return result


# ----------------------------------------------------------------------
# FILE INFERENCE
# ----------------------------------------------------------------------

def predict_audio_file(
    file_path,
    checkpoint_path=(
        "model/checkpoints/"
        "voice_spoof_detector.pkl"
    ),
):
    """
    Run detection on an audio file.
    """

    with open(
        file_path,
        "rb",
    ) as file:

        audio_bytes = file.read()

    result = predict_audio_buffer(
        audio_bytes,
        checkpoint_path,
    )

    result["file_path"] = file_path

    return result


# ----------------------------------------------------------------------
# CLI
# ----------------------------------------------------------------------

if __name__ == "__main__":

    import argparse

    parser = argparse.ArgumentParser(
        description=(
            "TRINETRA Audio File Predictor"
        )
    )

    parser.add_argument(
        "--audio",
        type=str,
        required=True,
        help="Path to input audio file",
    )

    parser.add_argument(
        "--model",
        type=str,
        default=(
            "model/checkpoints/"
            "voice_spoof_detector.pkl"
        ),
        help="Model checkpoint path",
    )

    args = parser.parse_args()

    result = predict_audio_file(
        args.audio,
        args.model,
    )

    print()
    print("=" * 70)
    print(
        "              TRINETRA DETECTION RESULT"
    )
    print("=" * 70)

    print(
        f"File              : "
        f"{result['file_path']}"
    )

    print(
        f"Segments analyzed : "
        f"{len(result['chunk_scores'])}"
    )

    print(
        f"Chunk scores      : "
        f"{result['chunk_scores']}"
    )

    print(
        f"Synthetic Prob.   : "
        f"{result['synthetic_probability']}"
    )

    print(
        f"Risk Score        : "
        f"{result['impersonation_risk_score']} / 100"
    )

    print(
        f"Risk Level        : "
        f"{result['risk_level']}"
    )

    print(
        f"Confidence        : "
        f"{result['confidence_score']}%"
    )

    print(
        f"Recommendation    : "
        f"{result['recommended_action']}"
    )

    print()
    print("Evidence:")

    for evidence in result[
        "evidence"
    ]:

        print(
            f"  • {evidence}"
        )

    print("=" * 70)