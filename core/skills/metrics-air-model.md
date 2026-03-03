---
title: "Metrics AIR Model"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "8e95f44b"
id: sk-22dc19

---

# Metrics AIR Model

> **Context**: The mathematical foundation and extensibility architecture for calculating market metrics (AGR, MDN) based on the A.I.R. (Alignment, Impulse, Risk) model.
> **Scope**: `core/metrics/*`, `core/config/models-config.js`

## Reasoning

- **#for-model-extensibility** The system uses `BaseModelCalculator` and `ModelManager` so that new mathematical models can be registered and swapped dynamically without altering the UI or data-fetching logic.
- **#for-air-math-contract** The specific formulas for A.I.R. (e.g., `AGR = R * (0.45 * I + 0.35 * A + 0.20 * I * A) * persistenceMultiplier`) represent strict domain logic. They must not be "refactored" or "optimized" by AI agents without explicit architectural approval, as doing so breaks the core product value.

## Core Rules

1.  **Model Extensibility:**
    All models must extend `BaseModelCalculator` and implement the required `calculateMetrics` interface. They must be registered in `ModelManager`.
2.  **Mathematical Purity:**
    Do not alter the weights or formulas in the A.I.R. model (Alignment, Impulse, Risk).
    - `A` (Alignment) = `tanh((CDH - CMD) / 8)`
    - `I` (Impulse) = `tanh(0.6 * CGRn + 0.4 * CPTn)`
    - `R` (Risk) = `1 / (1 + |DIN| / medianDIN)`
3.  **Persistence Multiplier:**
    The final AGR calculation includes a `persistenceMultiplier` based on the selected `agrMethod` (DCS, TSI, or MP). This logic must remain intact to ensure trend stability.

## Contracts

- **Inputs**: The model expects Price Variations (PV) from CoinGecko `[1h%, 24h%, 7d%, 14d%, 30d%, 200d%]`.
- **Outputs**: The model must return normalized values (typically `[-100, 100]`) for AGR and standard metrics expected by the UI.
