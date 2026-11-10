# Changelog

All notable changes to `india-tax-engine` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-11-10

### Added
- Core tax calculation engine supporting Indian salaried individuals below age 60 under new and old tax regimes for tax periods `2025-26` and `2026-27`.
- Full trace generation with step-by-step audit trail, rule attribution, assumptions, and warnings.
- Explicit support matrix validating resident status, individual taxpayer category, salary income head, and maximum total income threshold (Rs 50,00,000).
- Pure money module operating in integer paise internally with statutory Rs 10 rounding under Section 288A/288B equivalents.
- Public functions: `calculateTax`, `compareRegimes`, `explain`, `formatINR`.
- Schema validator for rule files (`validate-rules` CLI script).
- Zero runtime dependencies architecture.
