# Sources and Methodology

This document details the computation pipeline, architectural decisions, rule provenance, Phase 0 verification checklist, cross-check cases, and release criteria for `india-tax-engine`.

---

## (a) Calculation Pipeline

The calculation pipeline executes synchronously and deterministically in integer paise:

1. **Schema and Type Validation** (`validateInput`):
   Validates top-level structure, expected property types, finite non-negative numbers, at most 2 decimal places, and collects extra unexpected income or deduction keys.
2. **Profile Support Matrix** (`checkProfileSupport`):
   Verifies that the taxpayer is a resident individual below 60 with salary-only income heads and supported deductions. Returns `{ status: "unsupported", reasons: [...] }` if unsupported.
3. **Total Income Computation** (`computeTotalIncome`):
   - Computes standard deduction: `Math.min(salary, rules.standardDeduction * 100)`.
   - Under the old regime, computes applied Chapter VI-A: `Math.min(salary - standardDeduction, chapterVIA)`. Under the new regime, Chapter VI-A deductions are not applied (0).
   - Computes raw net income: `Math.max(0, salary - standardDeduction - chapterVIAApplied)`.
4. **Total Income Rounding Stage 1** (`roundToNearestTen`):
   Statutory rounding to the nearest ₹10 pursuant to Section 288A (IT Act 1961) / Section 516 (IT Act 2025). Paise are discarded first; remaining rupees ending in 5 or more round up to the next multiple of 10.
5. **Income Ceiling Check** (`checkIncomeCeiling`):
   Verifies that `totalIncome <= rules.support.maxTotalIncome * 100` (₹50,00,000). If total income exceeds ₹50,00,000, returns `{ status: "unsupported", reasons: [UNSUPPORTED_SURCHARGE_RANGE] }`.
6. **Slab Tax Computation** (`slabTax`):
   Applies progressive tax rates to total income within each slab bracket. Each slab's tax is computed in integer paise using `applyBps(amount, rateBps)` (floored to whole paise).
7. **Rebate & Marginal Relief**:
   - If `totalIncome <= rules.rebate.incomeLimit * 100`:
     Rebate is `Math.min(slabTax, rules.rebate.max * 100)`. Net tax after rebate = `slabTax - rebate`.
   - Else if `rules.rebate.marginalRelief` is true:
     Under the new regime, tax cannot exceed the excess of total income over the rebate threshold (`totalIncome - rebateLimit`). Capped tax = `Math.min(slabTax, totalIncome - rebateLimit)`. Marginal relief amount = `slabTax - cappedTax`. Net tax = `cappedTax`.
   - Else (old regime):
     No rebate or marginal relief applied (`marginalRelief: false`).
8. **Health and Education Cess** (`applyBps`):
   Calculated at 400 basis points (4%) on net tax after rebate/marginal relief, rounded down to whole paise.
9. **Payable Tax Rounding Stage 2** (`roundToNearestTen`):
   Statutory rounding of total payable tax (tax + cess) to the nearest ₹10 pursuant to Section 288B (IT Act 1961) / Section 516 (IT Act 2025). Paise are discarded first; remaining rupees ending in 5 or more round up to the next multiple of 10.
10. **Trace & Result Construction**:
    Generates numbered step trace with rule ID attribution, applied rules list, assumptions, and warnings.

---

## (b) Architectural Decisions

1. **Why Integer Paise Internally**:
   JavaScript IEEE 754 floating-point numbers introduce binary fraction representation errors (e.g. `0.1 + 0.2 !== 0.3`). By converting rupees to integer paise (`1 rupee = 100 paise`) at the input boundary and validating at most 2 decimal places, all arithmetic operations (subtraction, comparison, basis point application, statutory rounding) remain exact integer operations.
2. **Why Per-Slab Floor**:
   Each slab tax portion is calculated using basis points: `Math.floor((paise * bps) / 10000)`. Flooring per slab avoids fractional paise accumulation across slab boundaries, ensuring deterministic calculations that match statutory guidelines.
3. **Why Chapter VI-A is Ignored with a Warning Under the New Regime**:
   Under Section 115BAC (IT Act 1961) and its successor provisions under the Income-tax Act 2025, Chapter VI-A deductions (except Section 80CCD(2) employer NPS, which is not yet modeled) are not allowable. Instead of failing completely or silently discarding user input, the engine ignores the amount, completes the calculation, and emits an explicit warning (`CHAPTER_VIA_NOT_APPLICABLE`).
4. **Why ₹50,00,000 Ceiling**:
   Individual taxable income above ₹50,00,000 is subject to statutory surcharge at multiple brackets (10%, 15%, 25%), accompanied by separate marginal relief formulas for surcharge itself. Surcharge is explicitly out of scope for this prototype; any calculation where total income exceeds ₹50,00,000 returns `status: "unsupported"`.

---

## (c) Rule Table (Current Verification Labels)

Below are the exact rules extracted from `src/rules/india/2025-26.json` and `src/rules/india/2026-27.json`:

| Rule ID | Tax Period | Regime | Component | Provision Citation in Ruleset | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `IN-25-N-SLAB` | 2025-26 | new | Slabs | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-N-STDDED` | 2025-26 | new | Standard Deduction (₹75k) | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-N-REBATE` | 2025-26 | new | Rebate & Marginal Relief (₹12L) | s.87A Income-tax Act 1961 - TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-N-CESS` | 2025-26 | new | Health & Education Cess (4%) | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-N-ROUND` | 2025-26 | new | Statutory Rounding (₹10) | ss.288A and 288B Income-tax Act 1961 - TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-O-SLAB` | 2025-26 | old | Slabs | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-O-STDDED` | 2025-26 | old | Standard Deduction (₹50k) | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-O-REBATE` | 2025-26 | old | Rebate (₹5L / ₹12.5k max) | s.87A Income-tax Act 1961 - TO CONFIRM; old-regime marginal relief: sources conflict, majority says none | `open-conflict` |
| `IN-25-O-CESS` | 2025-26 | old | Health & Education Cess (4%) | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-25-O-ROUND` | 2025-26 | old | Statutory Rounding (₹10) | ss.288A and 288B Income-tax Act 1961 - TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-N-SLAB` | 2026-27 | new | Slabs | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-N-STDDED` | 2026-27 | new | Standard Deduction (₹75k) | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-N-REBATE` | 2026-27 | new | Rebate & Marginal Relief (₹12L) | s.156 Income-tax Act 2025 - TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-N-CESS` | 2026-27 | new | Health & Education Cess (4%) | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-N-ROUND` | 2026-27 | new | Statutory Rounding (₹10) | s.516 Income-tax Act 2025 - TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-O-SLAB` | 2026-27 | old | Slabs | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-O-STDDED` | 2026-27 | old | Standard Deduction (₹50k) | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-O-REBATE` | 2026-27 | old | Rebate (₹5L / ₹12.5k max) | s.156 Income-tax Act 2025 - TO CONFIRM; old-regime marginal relief: sources conflict, majority says none | `open-conflict` |
| `IN-26-O-CESS` | 2026-27 | old | Health & Education Cess (4%) | TO CONFIRM (Phase 0) | `secondary-corroborated` |
| `IN-26-O-ROUND` | 2026-27 | old | Statutory Rounding (₹10) | s.516 Income-tax Act 2025 - TO CONFIRM (Phase 0) | `secondary-corroborated` |

---

## (d) Phase 0 Verification Checklist (Owner Tasks)

The following verification tasks must be completed and checked off by the repository owner before promoting any rule status from `draft` / `secondary-corroborated` to `verified` / `primary-verified`:

### Period 2025-26: New Regime
- [ ] `IN-25-N-SLAB`: confirm against primary source: incometax.gov.in / Act / Finance Act (verify slabs: 0-4L nil, 4-8L 5%, 8-12L 10%, 12-16L 15%, 16-20L 20%, 20-24L 25%, above 24L 30%).
- [ ] `IN-25-N-STDDED`: confirm against primary source: incometax.gov.in / Act / Finance Act (verify standard deduction of ₹75,000 under section 16(ia)).
- [ ] `IN-25-N-REBATE` (limit & max): confirm against primary source: incometax.gov.in / Act / Finance Act (verify section 87A rebate income limit of ₹12,00,000 and max rebate ₹60,000).
- [ ] `IN-25-N-REBATE` (marginal relief): confirm against primary source: incometax.gov.in / Act / Finance Act (verify statutory marginal relief formula under section 87A proviso).
- [ ] `IN-25-N-CESS`: confirm against primary source: incometax.gov.in / Act / Finance Act (verify Health and Education Cess rate of 4%).
- [ ] `IN-25-N-ROUND`: confirm against primary source: incometax.gov.in / Act / Finance Act (verify statutory rounding to nearest ₹10 under sections 288A and 288B of Income-tax Act 1961).

### Period 2025-26: Old Regime
- [ ] `IN-25-O-SLAB`: confirm against primary source: incometax.gov.in / Act / Finance Act (verify slabs: 0-2.5L nil, 2.5-5L 5%, 5-10L 20%, above 10L 30%).
- [ ] `IN-25-O-STDDED`: confirm against primary source: incometax.gov.in / Act / Finance Act (verify standard deduction of ₹50,000 under section 16(ia)).
- [ ] `IN-25-O-REBATE` (limit & max): confirm against primary source: incometax.gov.in / Act / Finance Act (verify section 87A rebate income limit of ₹5,00,000 and max rebate ₹12,500).
- [ ] `IN-25-O-REBATE` (marginal relief conflict): confirm against primary source: incometax.gov.in / Act / Finance Act (resolve open conflict: confirm whether old regime section 87A rebate provides marginal relief or has cliff edge at ₹5,00,000).
- [ ] `IN-25-O-CESS`: confirm against primary source: incometax.gov.in / Act / Finance Act (verify Health and Education Cess rate of 4%).
- [ ] `IN-25-O-ROUND`: confirm against primary source: incometax.gov.in / Act / Finance Act (verify statutory rounding to nearest ₹10 under sections 288A and 288B of Income-tax Act 1961).

### Period 2026-27: New Regime
- [ ] `IN-26-N-SLAB`: confirm against primary source: incometax.gov.in / Act / Finance Act (verify slabs and rates under enacted Income-tax Act 2025).
- [ ] `IN-26-N-STDDED`: confirm against primary source: incometax.gov.in / Act / Finance Act (verify standard deduction provision and amount under Income-tax Act 2025).
- [ ] `IN-26-N-REBATE` (section s.156, limit & max): confirm against primary source: incometax.gov.in / Act / Finance Act (verify section number s.156 of Income-tax Act 2025, rebate limit ₹12,00,000, and max rebate ₹60,000).
- [ ] `IN-26-N-REBATE` (marginal relief): confirm against primary source: incometax.gov.in / Act / Finance Act (verify new-regime marginal relief provision and statutory phrasing under Income-tax Act 2025).
- [ ] `IN-26-N-CESS`: confirm against primary source: incometax.gov.in / Act / Finance Act (verify Health and Education Cess rate of 4% under Income-tax Act 2025).
- [ ] `IN-26-N-ROUND` (section s.516): confirm against primary source: incometax.gov.in / Act / Finance Act (verify statutory rounding to nearest ₹10 under section 516 of Income-tax Act 2025).

### Period 2026-27: Old Regime
- [ ] `IN-26-O-SLAB`: confirm against primary source: incometax.gov.in / Act / Finance Act (verify old regime slabs and rates under Income-tax Act 2025).
- [ ] `IN-26-O-STDDED`: confirm against primary source: incometax.gov.in / Act / Finance Act (verify old regime standard deduction under Income-tax Act 2025).
- [ ] `IN-26-O-REBATE` (section s.156): confirm against primary source: incometax.gov.in / Act / Finance Act (verify old regime rebate limit ₹5,00,000 and max rebate ₹12,500 under s.156 of Income-tax Act 2025).
- [ ] `IN-26-O-REBATE` (marginal relief conflict): confirm against primary source: incometax.gov.in / Act / Finance Act (confirm whether old regime marginal relief exists under s.156 of Income-tax Act 2025).
- [ ] `IN-26-O-CESS`: confirm against primary source: incometax.gov.in / Act / Finance Act (verify Health and Education Cess rate under Income-tax Act 2025).
- [ ] `IN-26-O-ROUND` (section s.516): confirm against primary source: incometax.gov.in / Act / Finance Act (verify rounding provisions under section 516 of Income-tax Act 2025).

---

## (e) Golden and Boundary Test Cases for Cross-Check

The following 7 golden cases and 4 boundary cases must be cross-checked on the official Income Tax Department calculator at `https://www.incometax.gov.in/`:

### 7 Golden Cases
1. **New Regime, Salary ₹12,75,000**:
   - Total Income: ₹12,00,000 (after ₹75,000 standard deduction)
   - Slab Tax: ₹60,000
   - Rebate: ₹60,000
   - Tax Payable: ₹0
2. **New Regime, Salary ₹12,00,000**:
   - Total Income: ₹11,25,000 (after ₹75,000 standard deduction)
   - Slab Tax: ₹52,500
   - Rebate: ₹52,500
   - Tax Payable: ₹0
3. **New Regime, Salary ₹12,85,000**:
   - Total Income: ₹12,10,000 (after ₹75,000 standard deduction)
   - Slab Tax: ₹61,500
   - Marginal Relief: ₹51,500 (capped at income excess ₹10,000)
   - Cess: ₹400
   - Tax Payable: ₹10,400
4. **New Regime, Salary ₹13,00,000**:
   - Total Income: ₹12,25,000 (after ₹75,000 standard deduction)
   - Slab Tax: ₹63,750
   - Marginal Relief: ₹38,750 (capped at income excess ₹25,000)
   - Cess: ₹1,000
   - Tax Payable: ₹26,000
5. **New Regime, Salary ₹15,00,000**:
   - Total Income: ₹14,25,000 (after ₹75,000 standard deduction)
   - Slab Tax: ₹93,750
   - Cess: ₹3,750
   - Tax Payable: ₹97,500
6. **Old Regime, Salary ₹5,50,000**:
   - Total Income: ₹5,00,000 (after ₹50,000 standard deduction)
   - Slab Tax: ₹12,500
   - Rebate: ₹12,500
   - Tax Payable: ₹0
7. **Old Regime, Salary ₹6,00,000**:
   - Total Income: ₹5,50,000 (after ₹50,000 standard deduction)
   - Slab Tax: ₹22,500
   - Cess: ₹900
   - Tax Payable: ₹23,400

### 4 Boundary Cases
1. **Old Regime ₹10,50,000 (₹10L slab boundary)**:
   - Salary: ₹10,50,000 | Standard Deduction: ₹50,000
   - Total Income: ₹10,00,000 | Slab Tax: ₹1,12,500 | Cess: ₹4,500 | Tax Payable: ₹1,17,000
2. **Old Regime ₹10,50,010 (just above ₹10L slab, statutory rounding)**:
   - Salary: ₹10,50,010 | Standard Deduction: ₹50,000
   - Total Income: ₹10,00,010 | Slab Tax: ₹1,12,503 | Cess: ₹4,500.12 (12 paise dropped)
   - Tax Payable (rounded to nearest ₹10): ₹1,17,000
3. **New Regime ₹13,45,580 (marginal relief crossover)**:
   - Salary: ₹13,45,580 | Standard Deduction: ₹75,000
   - Total Income: ₹12,70,580 | Slab Tax: ₹70,587 | Marginal Relief: ₹7 (capped at ₹70,580)
   - Cess: ₹2,823.20 | Tax Payable (rounded to nearest ₹10): ₹73,400
4. **New Regime ₹16,75,000 (₹16L slab boundary)**:
   - Salary: ₹16,75,000 | Standard Deduction: ₹75,000
   - Total Income: ₹16,00,000 | Slab Tax: ₹1,20,000 | Cess: ₹4,800 | Tax Payable: ₹1,24,800

---

## (f) Release Gate (from PRD)

The PRD defines the strict conditions that must be satisfied before any release is cut or published:

1. **Zero Runtime Dependencies**: The package must not contain any runtime dependencies in `package.json`.
2. **Offline & Sandboxed Execution**: The engine must never execute network requests, access filesystem, read clocks (`Date`), or use non-deterministic randomness.
3. **Primary-Source Verification**: Every rule in the ruleset must be verified against primary statutory texts (`verification: "primary-verified"`), and the ruleset status must be promoted to `"verified"`.
4. **Full Test Suite & Invariant Green**:
   - `npm run verify` (`typecheck`, `validate-rules`, and `vitest run`) passes with 0 errors.
   - All golden test cases, boundary test cases, and 500-sample fuzzing property tests pass.
   - Monotonicity invariant holds across the supported salary domain.
5. **Fresh Consumer Verification**:
   - `npm run consumer-test` successfully packs the tarball, installs it in a clean temporary directory, and verifies both ESM and CommonJS imports.
