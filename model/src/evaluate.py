"""
TRINETRA - Model Evaluation & Latency Benchmarking Script
"""

import os
import sys
import time
import argparse
import numpy as np

# Add model/src to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from features import AudioFeatureExtractor
from model import VoiceSpoofDetector

def main():
    parser = argparse.ArgumentParser(description="Evaluate TRINETRA Model & Benchmark Latency")
    parser.add_argument("--model", type=str, default="model/checkpoints/voice_spoof_detector.pkl", help="Model path")
    args = parser.parse_args()

    if not os.path.exists(args.model):
        print(f"[Error] Model checkpoint not found at: {args.model}")
        sys.exit(1)

    print("=" * 60)
    print("      TRINETRA - MODEL LATENCY & INFERENCE BENCHMARK")
    print("=" * 60)

    detector = VoiceSpoofDetector.load(args.model)
    extractor = AudioFeatureExtractor(sample_rate=16000)

    # Benchmarking latency across 50 simulated audio chunks (3.0s window @ 16kHz)
    sample_rate = 16000
    chunk_samples = int(3.0 * sample_rate)
    latencies = []

    print("[Benchmark] Running 50 inference cycles on 3-second audio chunks...")
    for i in range(50):
        # Generate dummy 3s audio chunk
        dummy_audio = np.random.normal(0, 0.1, chunk_samples)
        
        start_time = time.perf_counter()
        feat = extractor.extract_feature_vector(dummy_audio, sample_rate)
        res = detector.calculate_risk_score(feat)
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        latencies.append(elapsed_ms)

    avg_latency = np.mean(latencies)
    p95_latency = np.percentile(latencies, 95)
    p99_latency = np.percentile(latencies, 99)

    print("\n" + "=" * 60)
    print("               LATENCY BENCHMARK RESULTS")
    print("=" * 60)
    print(f"  Average Processing Latency : {avg_latency:.2f} ms")
    print(f"  P95 Processing Latency     : {p95_latency:.2f} ms")
    print(f"  P99 Processing Latency     : {p99_latency:.2f} ms")
    print(f"  Real-time Suitability      : {'PASSED (Real-Time Capable)' if avg_latency < 50.0 else 'WARN'}")
    print("=" * 60)

if __name__ == "__main__":
    main()
