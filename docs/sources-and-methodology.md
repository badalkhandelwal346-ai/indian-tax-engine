# Sources and Methodology

This document outlines the computation pipeline, architectural decisions, rule provenance, and verification procedures for `india-tax-engine`.

## Calculation Pipeline

The computation pipeline is deterministic, synchronous, and operates strictly in integer paise internally:

```
[Input Validation]
        │ (Validate schema, types, positive numbers, 2 decimal places, supported scope)
        ▼
[Profile Support Matrix]
        │ (Resident individual below 60, salary only)
        ▼
[Standard & Chapter VI-A Deduction]
        │ (Apply standard deduction; apply declared Chapter VI-A for Old Regime)
        ▼
[Total Income Rounding]
        │ (Statutory rounding to nearest Rs 10 under Section 288A equivalent)
        ▼
[Income Ceiling Check]
        │ (Ceiling: Rs 50,00,000; surcharge is not implemented)
        ▼
[Slab Tax Computation]
        │ (Progressive rate calculation through tax slabs)
        ▼
[Rebate & Marginal Relief]
        │ (New regime: Section 156 / 87A rebate & marginal relief)
        │ (Old regime: Section 87A rebate without marginal relief - see Open Conflict)
        ▼
[Health & Education Cess]
        │ (400 bps / 4% applied to net tax after rebate)
        ▼
[Tax Payable Rounding]
        │ (Statutory rounding to nearest Rs 10 under Section 288B equivalent)
        ▼
[Trace & Results Generation]
        │ (Explainable step-by-step trace with rule attribution and warnings)
```

## Rule Provenance and Verification Table

Rules are maintained in version-controlled JSON files under `src/rules/india/`.

| Rule ID | Tax Period | Regime | Component | Provision Reference | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `IN-25-N-SLAB` | 2025-26 | new | Slabs | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-N-STDDED`| 2025-26 | new | Std Deduction | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-N-REBATE`| 2025-26 | new | Rebate & Relief | s.87A Income-tax Act 1961 - TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-N-CESS` | 2025-26 | new | Cess (4%) | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-N-ROUND` | 2025-26 | new | Rounding (Rs 10)| ss.288A and 288B Income-tax Act 1961 - TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-O-SLAB` | 2025-26 | old | Slabs | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-O-STDDED`| 2025-26 | old | Std Deduction | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-O-REBATE`| 2025-26 | old | Rebate | s.87A Income-tax Act 1961 - TO CONFIRM; old-regime marginal relief: sources conflict, majority says none | `open-conflict` |
| `IN-25-O-CESS` | 2025-26 | old | Cess (4%) | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-O-ROUND` | 2025-26 | old | Rounding (Rs 10)| ss.288A and 288B Income-tax Act 1961 - TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-N-SLAB` | 2026-27 | new | Slabs | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-N-STDDED`| 2026-27 | new | Std Deduction | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-N-REBATE`| 2026-27 | new | Rebate & Relief | s.156 Income-tax Act 2025 - TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-N-CESS` | 2026-27 | new | Cess (4%) | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-N-ROUND` | 2026-27 | new | Rounding (Rs 10)| s.516 Income-tax Act 2025 - TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-O-SLAB` | 2026-27 | old | Slabs | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-O-STDDED`| 2026-27 | old | Std Deduction | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-O-REBATE`| 2026-27 | old | Rebate | s.156 Income-tax Act 2025 - TO CONFIRM; old-regime marginal relief: sources conflict, majority says none | `open-conflict` |
| `IN-26-O-CESS` | 2026-27 | old | Cess (4%) | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-O-ROUND` | 2026-27 | old | Rounding (Rs 10)| s.516 Income-tax Act 2025 - TO CONFIRM (Phase 0) | `secondary-corroborated` |

### Open Conflict: Old Regime Marginal Relief
Under Section 87A for the old regime, when taxable income exceeds Rs 5,00,000 (even by Rs 10 to Rs 5,00,010), the rebate of up to Rs 12,500 is completely withdrawn, resulting in a tax cliff of Rs 13,000 (including cess). While marginal relief is explicitly enacted for the new regime under the proviso to section 87A, authoritative secondary sources conflict on whether marginal relief was extended to the old regime. Currently, the engine implements `marginalRelief: false` for the old regime with the verification status `open-conflict` and emits warning `RULE_OPEN_CONFLICT`.

---

## Phase 0 Verification Checklist (Owner Tasks)

Before promoting any rule from `draft` / `secondary-corroborated` to `primary-verified`:

- [ ] **2025-26 New Regime**: Confirm slabs and rates against Finance Act / Income Tax Act 1961 provisions.
- [ ] **2025-26 New Regime**: Confirm standard deduction of Rs 75,000 under section 16(ia).
- [ ] **2025-26 New Regime**: Confirm section 87A rebate limit (Rs 12,00,000) and statutory marginal relief wording.
- [ ] **2025-26 New Regime**: Confirm 4% Health & Education cess.
- [ ] **2025-26 New Regime**: Confirm statutory rounding rules under ss.288A and 288B.
- [ ] **2025-26 Old Regime**: Confirm slabs and rates (2.5L / 5L / 10L).
- [ ] **2025-26 Old Regime**: Confirm standard deduction of Rs 50,00,000 under section 16(ia).
- [ ] **2025-26 Old Regime**: Resolve open conflict on section 87A marginal relief.
- [ ] **2026-27 New Regime**: Verify enacted sections under the new Income-tax Act 2025 (provisions for slabs, standard deduction, rebate under s.156, cess, and rounding under s.516).
- [ ] **2026-27 Old Regime**: Verify enacted sections under Income-tax Act 2025 and confirm whether old regime is preserved.

---

## Golden and Boundary Cases for Cross-Check

Cross-check these cases against the official Income Tax Department calculator at [https://www.incometax.gov.in/](https://www.incometax.gov.in/):

### Golden Cases
1. **New Regime Rs 12,75,000**: Total Income Rs 12,00,000 | Slab Tax Rs 60,000 | Payable Rs 0 (full rebate)
2. **New Regime Rs 12,00,000**: Total Income Rs 11,25,000 | Slab Tax Rs 52,500 | Payable Rs 0 (full rebate)
3. **New Regime Rs 12,85,000**: Total Income Rs 12,10,000 | Slab Tax Rs 61,500 | Payable Rs 10,400 (marginal relief applied)
4. **New Regime Rs 13,00,000**: Total Income Rs 12,25,000 | Slab Tax Rs 63,750 | Payable Rs 26,000 (marginal relief applied)
5. **New Regime Rs 15,00,000**: Total Income Rs 14,25,000 | Slab Tax Rs 93,750 | Payable Rs 97,500
6. **Old Regime Rs 5,50,000**: Total Income Rs 5,00,000 | Slab Tax Rs 12,500 | Payable Rs 0 (full rebate)
7. **Old Regime Rs 6,00,000**: Total Income Rs 5,50,000 | Slab Tax Rs 22,500 | Payable Rs 23,400

### Boundary Cases
1. **Old Regime Rs 10,50,000 (10L slab boundary)**: Salary 10,50,000 | Total Income 10,00,000 | Payable Rs 1,17,000
2. **Old Regime Rs 10,50,010 (just above 10L slab)**: Salary 10,50,010 | Total Income 10,00,010 | Payable Rs 1,17,000 (statutory rounding ignores 12 paise cess)
3. **New Regime Rs 13,45,580 (marginal relief crossover)**: Salary 13,45,580 | Total Income 12,70,580 | Payable Rs 73,400
4. **New Regime Rs 16,75,000 (16L slab boundary)**: Salary 16,75,000 | Total Income 16,00,000 | Payable Rs 1,24,800

---

## Release Gate

A release to production or npm requires:
1. All rules in the ruleset have `verification: "primary-verified"`.
2. Ruleset `status` is promoted to `"verified"`.
3. `npm run verify` passes with 0 validation issues and 0 warnings about unverified rules.
4. Independent human sign-off on the Phase 0 verification checklist.
