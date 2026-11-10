# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased / 0.1.0]

### Added
- Core tax calculation engine supporting Indian salaried individuals below age 60 under new and old tax regimes for tax periods `2025-26` and `2026-27`.
- Full trace generation with step-by-step audit trail, rule attribution, assumptions, and warnings.
- Public API functions:
  - `calculateTax(input)`: single-regime tax computation returning `CompleteResult` or `UnsupportedResult`.
  - `compareRegimes(input)`: comparison between new and old regimes with differential tax savings calculation.
  - `explain(result)`: deterministic plaintext formatter generating readable breakdown of steps, assumptions, warnings, or unsupported reasons.
  - `formatINR(rupees)`: Indian numeral grouping formatter using `₹` prefix.
  - `SUPPORTED_TAX_PERIODS`: array of supported tax period keys (`["2025-26", "2026-27"]`).
- Explicit profile support matrix validating:
  - Individual taxpayer category.
  - Resident status.
  - Below-60 age band.
  - Salary-only income head.
  - Ceiling check at Rs 50,00,000 total income (surcharge is not supported).
- Exact money arithmetic operating in integer paise internally with statutory rounding to the nearest Rs 10 under Section 288A and 288B equivalents.
- Progressive slab calculator with per-slab flooring to whole paise.
- Standard deduction (Rs 75,000 new regime / Rs 50,000 old regime).
- Section 87A rebate and marginal relief on new regime rebate.
- Old regime Section 87A rebate without marginal relief (with `RULE_OPEN_CONFLICT` warning).
- Health and Education Cess at 4% (400 bps).
- Ruleset schema validator script (`validate-rules.ts`).
- Zero runtime dependencies architecture.
