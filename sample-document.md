# Quantum Computing: State of the Field — 2024 Summary Report

## Overview

Quantum computing has reached several critical milestones in 2024. This document summarises the key technical developments, leading organisations, and near-term commercial outlook based on published research and industry disclosures.

---

## Hardware Progress

### Google — Willow Chip

In December 2024, Google announced the **Willow** quantum chip, a 105-qubit processor that demonstrated below-threshold error correction for the first time. Crucially, adding more qubits _reduced_ errors rather than increasing them — a prerequisite for practical fault-tolerant quantum computing. On a specific benchmark task, Willow completed a computation in under five minutes that would take a classical supercomputer 10 septillion years.

### IBM — Heron Processor

IBM's **Heron** processor (133 qubits) was released in late 2023 and became their primary production chip in 2024. IBM's roadmap targets a 100,000-qubit fault-tolerant system by 2033, with intermediate milestones at 1,000 qubits (2023, Condor) and 10,000 qubits (2025, Kookaburra). IBM's approach uses heavy-hex qubit layout to reduce error rates from adjacent qubit interference.

### Microsoft — Topological Qubits

Microsoft is pursuing a fundamentally different hardware strategy using **topological qubits** based on Majorana zero modes. In 2023 they published peer-reviewed evidence of creating the necessary topological gap. Topological qubits are theoretically far more stable than superconducting qubits, potentially requiring 1,000× fewer physical qubits per logical qubit for error correction.

### IonQ and Trapped-Ion Systems

IonQ's trapped-ion systems consistently achieve higher gate fidelities than superconducting alternatives (>99.9% two-qubit gate fidelity). The trade-off is speed — trapped-ion gate operations take microseconds vs nanoseconds for superconducting qubits. IonQ's Forte system (36 algorithmic qubits) is available via AWS and Azure cloud.

---

## Error Correction

Practical quantum advantage requires **logical qubits** protected by quantum error correction (QEC). Current physical error rates (~0.1–1%) must be reduced to below ~0.01% for algorithms like Shor's (cryptography) or quantum chemistry simulations to outperform classical computers.

The **surface code** is the leading QEC approach, requiring roughly 1,000 physical qubits per logical qubit at current error rates. Google's Willow result is the first demonstration that increasing the distance of the surface code (adding more physical qubits) improves logical qubit quality — a key theoretical requirement that had not been experimentally confirmed before.

---

## Near-Term Applications (NISQ Era)

Current devices operate in the **Noisy Intermediate-Scale Quantum (NISQ)** era — too noisy for fault-tolerant algorithms but potentially useful for:

- **Quantum chemistry**: Simulating molecular systems for drug discovery and materials science. Companies like Quantinuum and Q-NEXT are targeting nitrogen fixation and battery material simulations.
- **Optimisation**: Solving combinatorial problems in logistics, finance, and scheduling. Early results are mixed — classical heuristics remain competitive for most real-world problem sizes.
- **Quantum machine learning**: Theoretical speedups exist but practical advantage has not been demonstrated on real hardware yet.
- **Financial modelling**: JPMorgan Chase and Goldman Sachs have published research on quantum Monte Carlo for derivatives pricing, claiming potential quadratic speedups.

---

## Cryptographic Implications

Shor's algorithm, when run on a fault-tolerant quantum computer, can break **RSA and ECC encryption** (the basis of most internet security). Estimates for when this becomes feasible range from 10–20 years.

In response, **NIST finalised its first post-quantum cryptography (PQC) standards in August 2024**:

- **ML-KEM** (CRYSTALS-Kyber) — key encapsulation
- **ML-DSA** (CRYSTALS-Dilithium) — digital signatures
- **SLH-DSA** (SPHINCS+) — hash-based signatures

Organisations are advised to begin **crypto-agility** planning now — auditing which systems use vulnerable cryptography and preparing migration roadmaps, as adversaries may be harvesting encrypted data today to decrypt once quantum computers mature ("harvest now, decrypt later" attacks).

---

## Key Players

| Organisation | Approach               | Qubit Count (2024) | Cloud Access             |
| ------------ | ---------------------- | ------------------ | ------------------------ |
| Google       | Superconducting        | 105 (Willow)       | Google Cloud             |
| IBM          | Superconducting        | 133 (Heron)        | IBM Quantum / AWS        |
| Microsoft    | Topological (Majorana) | Pre-commercial     | Azure Quantum            |
| IonQ         | Trapped-ion            | 36 AQ (Forte)      | AWS, Azure, Google Cloud |
| Quantinuum   | Trapped-ion            | 56 (H2)            | Azure                    |
| Rigetti      | Superconducting        | 84 (Ankaa-3)       | AWS                      |
| PsiQuantum   | Photonic               | Pre-commercial     | —                        |

---

## Investment and Market Size

Global quantum computing investment reached approximately **$2.35 billion in 2023** (public and private combined), down from a 2022 peak of ~$2.9 billion as the broader tech investment climate cooled. Government programmes remain strong:

- US National Quantum Initiative: $1.8 billion authorised through 2023
- EU Quantum Flagship: €1 billion through 2028
- China: estimated $15 billion in state investment through 2030 (reported)

Market forecasts for the quantum computing industry range from **$450 billion to $850 billion by 2040** (McKinsey, BCG estimates), though these figures assume successful fault-tolerant systems — far from guaranteed.

---

## Timeline Estimates (Industry Consensus)

| Milestone                                             | Estimated Date |
| ----------------------------------------------------- | -------------- |
| 1,000+ physical qubit systems                         | 2024–2025 ✓    |
| Demonstration of quantum utility on practical problem | 2025–2027      |
| Fault-tolerant logical qubit (small scale)            | 2027–2030      |
| Cryptographically relevant quantum computer           | 2030–2040      |
| Broad quantum advantage across industries             | 2035+          |

---

## Limitations and Scepticism

Not all researchers share the optimistic timeline. Key challenges:

- **Scalability**: Error rates typically _increase_ as systems scale — Google's Willow is the first credible evidence this can be overcome.
- **Coherence times**: Qubits decohere in microseconds to milliseconds. Even with error correction, sustaining long computations remains unsolved.
- **Classical simulation**: Many proposed quantum speedups have been "dequantised" — classical algorithms improved to match theoretical quantum performance on specific tasks.
- **Cooling requirements**: Superconducting qubits operate near absolute zero (~15 millikelvin), requiring expensive dilution refrigerators that do not scale easily.

Researchers like Gil Kalai and Mikhail Dyakonov have argued that fault-tolerant quantum computing may face fundamental physical barriers that current roadmaps underestimate.
