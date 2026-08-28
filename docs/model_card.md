# Model Card — TRINETRA Voice Impersonation Detector

## Model Overview
- **Model Name:** TRINETRA VoiceSpoofDetector (v1.0)
- **Problem Statement:** SIH 2026 — PS 26104 (AI-Powered Real-Time Voice Cloning & Impersonation Detection)
- **Model Type:** Hybrid Gradient Boosting / Ensemble Classifier on Multi-Acoustic Representations
- **Primary Features:** Linear Frequency Cepstral Coefficients (LFCC), Mel-Frequency Cepstral Coefficients (MFCC), Pitch ($F_0$) Contour & Jitter, Energy Contours, Spectral Statistics (Centroid, Bandwidth, Rolloff, Flatness, Zero Crossing Rate).

---

## Architecture & Feature Engineering

### 1. LFCC (Linear Frequency Cepstral Coefficients)
- **Why LFCC?** Traditional MFCC compresses high frequencies using the Mel scale (designed for human speech perception). However, AI speech generators, vocoders (e.g. WaveNet, HiFi-GAN), and voice conversion algorithms leave distinct high-frequency spectral artifacts above 4kHz. LFCC preserves equal linear frequency resolution across the full spectrum to catch synthesis traces.

### 2. Prosodic & Pitch Dynamics
- **Metrics:** Pitch mean, pitch variance, pitch range, pitch jitter estimate, energy skewness, and pause rhythm.
- **Purpose:** Natural human speech exhibits rich, non-periodic pitch variations and subtle muscular micro-tremors, whereas synthetic speech often presents over-smoothed or unnatural pitch contours.

### 3. Dynamic Impersonation Risk Score (0–100)
Calculates a continuous risk score calibrated across 4 security levels:
- **0 – 29 (LOW):** Normal voice dynamics. Low risk.
- **30 – 59 (MEDIUM):** Elevated risk. Increase session monitoring.
- **60 – 79 (HIGH):** High impersonation probability. Require secondary verification (e.g. callback / MFA).
- **80 – 100 (CRITICAL):** Critical voice cloning alert. Pause sensitive financial or administrative actions immediately.

---

## Target Benchmarks & Metrics
- **Target Latency:** < 50 ms per 3-second audio chunk.
- **Evaluation Metrics:** Accuracy, Precision, Recall, F1-Score, ROC-AUC, Equal Error Rate (EER).
- **Supported Formats:** `.flac`, `.wav`, `.mp3`, `.ogg` (resampled to 16kHz mono).
