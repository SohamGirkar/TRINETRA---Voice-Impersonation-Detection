# VoiceShield Engineering & UX Rules

---

## 1. Zero-Trope UI Design Directive
- **NO generic SaaS dashboard aesthetic:** Avoid oversized rounded cards, pastel bubbles, or generic AI purple-pink gradients.
- **NO fake AI tropes:** No animated brain icons, no meaningless spinning glowing circles without telemetry backing, no decorative charts that do not display real telemetry data.
- **Dark Mission-Control Aesthetic:** Deep near-black `#080b10` and rich navy `#0d131f` foundations with restrained electric cyan (`#00f0ff`), deep steel blue (`#1e293b`), amber warning (`#f59e0b`), and controlled crimson (`#ef4444`).
- **Information Density:** Prioritize high operational visibility. Every pixel must serve the security analyst's decision-making loop.

---

## 2. Terminology & Communication Protocol
- **Strict Non-Defamatory Phrasing:** The platform NEVER declares "This caller is a fake" or "This person is a fraud."
- **Standard Phrasing Taxonomy:**
  - `Low Risk`: "Vocal tract acoustics consistent with natural human speech dynamics. No synthetic artifacts detected."
  - `Medium Risk`: "Inconclusive acoustic signature. Minor compression artifacts or elevated vocal strain detected. Monitor telemetry."
  - `High Risk`: "Elevated impersonation risk detected. Phase inconsistencies and neural vocoder spectral traits identified. Perform out-of-band identity verification."
  - `Critical Risk`: "Critical impersonation anomaly detected. High-confidence synthetic voice generation signature identified. Halt privileged transaction authorization."

---

## 3. 3D "Voice Integrity Core" Performance & Visual Rules
- **Engine:** Three.js + React Three Fiber.
- **Rendering Efficiency:** Target constant 60 FPS. Optimize vertex counts, use instancing/buffers where appropriate, and minimize CPU-GPU memory transfers.
- **Degradation Policy:** If WebGL is unavailable or FPS drops below threshold, gracefully transition to an optimized 2D Canvas/SVG spectrum core.
- **Aesthetic Consistency:** The 3D core must reflect the live risk state:
  - *Low Risk:* Calm, harmonic orbital flow, geometric coherence, deep cyan/emerald hues.
  - *Medium Risk:* Agitated particle displacement, minor vertex jitter, amber coloration.
  - *High Risk:* Significant structural turbulence, phase distortion spikes, orange-amber warning state.
  - *Critical Risk:* Severe harmonic fragmentation, jagged frequency anomalies, controlled deep crimson resonance.

---

## 4. Privacy & Compliance Principles
- **Volatile Processing:** Audio FFT and embeddings are processed in transient ring buffers.
- **Monospace Telemetry:** Session IDs, cryptographic checksums, timestamps, and DSP numerical data must be rendered in clean monospace typography.
- **Auditability:** Every risk score update must correlate to a timestamped telemetry log event.
