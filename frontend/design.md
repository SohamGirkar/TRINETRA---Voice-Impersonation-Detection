# VoiceShield Visual & Design System Specification

---

## 1. Design Aesthetics & Visual Philosophy
VoiceShield's visual interface is engineered for mission-critical security operations centers (SOC), fintech fraud prevention desks, and intelligence monitoring. It eschews superficial web design tropes in favor of deliberate, high-contrast, information-dense visual telemetry.

---

## 2. Color Palette & Tokens

### 2.1 Backgrounds & Surfaces
- **Canvas Base (`--bg-primary`):** `#06090e` (Deep void black with subtle slate undertone)
- **Panel Surface (`--bg-surface`):** `#0a0f18` (Tactical deep navy)
- **Elevated Surface (`--bg-elevated`):** `#101726` (Subtle blue-gray tint)
- **Border Subtle (`--border-subtle`):** `rgba(255, 255, 255, 0.07)`
- **Border Active (`--border-active`):** `rgba(0, 240, 255, 0.35)`

### 2.2 Accent & Brand Accents
- **Primary Cyber Cyan (`--accent-cyan`):** `#00f0ff` (High-precision telemetry accent)
- **Deep Electric Blue (`--accent-blue`):** `#3b82f6`
- **Subtle Violet Glow (`--accent-violet`):** `#8b5cf6`

### 2.3 Risk & State Signaling (Calculated, Controlled)
- **Low Risk / Nominal (`--risk-low`):** `#10b981` (Emerald cyan-green)
- **Medium Risk / Ambiguous (`--risk-medium`):** `#f59e0b` (Industrial amber)
- **High Risk / Alert (`--risk-high`):** `#f97316` (Deep warning orange)
- **Critical Risk / Threat (`--risk-critical`):** `#ef4444` (Pure threat crimson)

---

## 3. Typography Hierarchy
- **Display & Interface:** `Plus Jakarta Sans`, `-apple-system`, `sans-serif` (Weights: 400, 500, 600, 700)
- **Telemetry & Technical Monospace:** `JetBrains Mono`, `Space Mono`, `ui-monospace`, `monospace` (Weights: 400, 500, 700)

---

## 4. Layout Architecture
- **Header Status Strip:** 48px fixed height, containing system heartbeat, session metadata, scenario picker, and live DSP toggle.
- **Navigation Rail / Top Bar:** Integrated clean sub-nav with status badges and quick action triggers.
- **Main Grid (12-Column Tactical Grid):**
  - Left Col (4-cols / 5-cols): 3D Voice Integrity Core + Live Risk Score + Speaker Verification.
  - Right Col (7-cols / 8-cols): Real-Time Risk Evolution Chart + Multi-Vector Detection Signal Matrix + Action Recommendation + Event Telemetry Stream.
