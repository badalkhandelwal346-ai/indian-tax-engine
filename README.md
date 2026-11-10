# india-tax-engine

> Status: prototype (v0.x), rules are drafts pending primary-source verification.

This library produces an informational estimate. It is not tax advice, not suitable for filing a return, and not endorsed by any tax authority. Verify results with the Income Tax Department's official resources or a qualified professional.

---

`india-tax-engine` is a deterministic, offline TypeScript library that calculates Indian income tax for resident individuals below 60 with salary income only, covering the new and old regimes for tax periods `2025-26` and `2026-27`. It has zero runtime dependencies and produces an explainable, traceable audit trail for every computation.

## Installation

```bash
npm install india-tax-engine
```

## Quick Start

```ts
import { calculateTax, compareRegimes, explain } from "india-tax-engine";

// 1. Calculate tax under a specific regime
const result = calculateTax({
  taxPeriod: "2026-27",
  regime: "new",
  taxpayer: {
    category: "individual",
    residentialStatus: "resident",
    ageBand: "below-60",
  },
  income: { salary: 1285000 },
});

console.log(explain(result));
```

### Actual Output

```text
Tax estimate for 2026-27, new regime (ruleset IN-2026-27-new-r1)
 1. Gross salary.................................. ₹12,85,000
 2. Standard deduction............................ ₹75,000
 3. Total income (rounded to nearest ₹10)......... ₹12,10,000
 4. Tax on slabs.................................. ₹61,500
 5. Marginal relief............................... ₹51,500
 6. Health and education cess..................... ₹400
 7. Tax payable (rounded to nearest ₹10).......... ₹10,400
Total tax payable: ₹10,400
Assumptions:
 - Resident individual below 60 with salary income only.
 - Income is gross annual salary; the ruleset's standard deduction is applied automatically.
 - Informational estimate only; not tax advice and not suitable for filing.
Warnings:
 - [RULES_NOT_VERIFIED] Ruleset IN-2026-27-new-r1 has status "draft"; figures are not confirmed against primary sources.
```

### Regime Comparison

```ts
const comparison = compareRegimes({
  taxPeriod: "2026-27",
  taxpayer: {
    category: "individual",
    residentialStatus: "resident",
    ageBand: "below-60",
  },
  income: { salary: 1285000 },
  deductions: { chapterVIA: 150000 },
});

console.log(explain(comparison));
// Output: ... The new regime is cheaper by ₹1,33,120.
```

---

## API Reference

### `calculateTax(input: TaxInput): TaxResult`
Computes tax payable for the given tax period and regime. Returns either a `CompleteResult` or an `UnsupportedResult`.

### `compareRegimes(input: CompareInput): CompareResult`
Computes tax under both the new and old regimes and calculates which is cheaper and by how much. If either regime is unsupported, returns `UnsupportedResult` with deduplicated reasons.

### `explain(result: TaxResult | CompareResult): string`
Produces a deterministic, formatted plaintext audit trail of calculation steps, assumptions, warnings, or unsupported reasons.

### `formatINR(rupees: number): string`
Formats an INR amount using Indian numeral grouping (e.g., `1210000` -> `"₹12,10,000"`).

---

## Units and Rounding

- **API Boundary**: Amounts in inputs and outputs are in INR rupees (allowing up to 2 decimal places for paise).
- **Internal Arithmetic**: All calculations operate strictly on integer paise (`1 rupee = 100 paise`).
- **Statutory Rounding**: Total income and tax payable are statutory rounded to the nearest Rs 10 (paise ignored first; 5 rupees rounds up) pursuant to Section 288A and Section 288B equivalents.

---

## The Two Failure Modes

1. **Malformed Input (Throws `TaxInputError`)**:
   Input that fails schema validation or is malformed throws a `TaxInputError` containing a stable error code, descriptive message, and the offending field name.
   
   Error Codes:
   - `INVALID_INPUT`: Malformed structure, non-object, extra unexpected top-level keys, or type mismatch.
   - `MISSING_FIELD`: A required field is missing.
   - `INVALID_NUMBER`: Number is not finite (NaN, Infinity).
   - `NEGATIVE_AMOUNT`: Amount is less than 0.
   - `TOO_MANY_DECIMALS`: Number has more than 2 decimal places.
   - `AMOUNT_TOO_LARGE`: Amount exceeds the supported maximum input limit (Rs 1,000 crore).
   - `UNKNOWN_TAX_PERIOD`: Tax period is not recognized or supported.
   - `UNKNOWN_REGIME`: Regime is not `"new"` or `"old"`.

2. **Valid but Unsupported Input (Returns `{ status: "unsupported", reasons: [...] }`)**:
   Input that is structurally valid but outside the supported scope returns an object with `status: "unsupported"` and an array of `reasons` explaining why.
   
   Reason Codes:
   - `UNSUPPORTED_JURISDICTION`: Non-Indian jurisdiction.
   - `UNSUPPORTED_TAXPAYER_CATEGORY`: Non-individual category (e.g., HUF, company).
   - `UNSUPPORTED_RESIDENTIAL_STATUS`: Non-resident or resident-not-ordinarily-resident.
   - `UNSUPPORTED_AGE_BAND`: Senior or super-senior citizen age band.
   - `UNSUPPORTED_INCOME_HEAD`: Unsupported income heads (house property, capital gains, etc.).
   - `UNSUPPORTED_DEDUCTION`: Unsupported deduction categories.
   - `UNSUPPORTED_SURCHARGE_RANGE`: Total income exceeds Rs 50,00,000.

---

## Support Matrix

| Dimension | Supported | Unsupported |
| :--- | :--- | :--- |
| **Tax Periods** | `2025-26`, `2026-27` | Any other tax period |
| **Regimes** | `new`, `old` | Any other regime |
| **Taxpayer Category** | Individual | HUF, Firm, LLP, Company, AOP/BOI |
| **Residential Status** | Resident | Non-Resident (NRI), RNOR |
| **Age Band** | Below 60 | 60 to 79 (Senior), 80+ (Super Senior) |
| **Income Heads** | Salary (`income.salary`) | House Property, Business/Profession, Capital Gains, Other Sources |
| **Deductions** | Standard deduction (auto), Chapter VI-A total (`deductions.chapterVIA`, old regime only) | Section-wise validation (80C, 80D, 80G, etc.) |
| **Income Ceiling** | Total income up to Rs 50,00,000 | Total income above Rs 50,00,000 (Surcharge range) |

---

## Known Limitations

1. **No Surcharge**: Surcharge calculation is not implemented. Any input resulting in a total income greater than Rs 50,00,000 returns `status: "unsupported"`.
2. **Old-Regime Rebate Marginal Relief Conflict**: In the old regime, when taxable income crosses Rs 5,00,000, Section 87A rebate is zero, causing a tax cliff. Authoritative secondary sources conflict on whether statutory marginal relief applies to the old regime. The engine sets `marginalRelief: false` for the old regime, marks the rule with `verification: "open-conflict"`, and emits a warning.
3. **Draft Rulesets**: Current rulesets have status `draft` and verification `secondary-corroborated` or `open-conflict` pending Phase 0 primary-source verification.

---

## How Rules Work

Tax rates, slabs, deduction amounts, and thresholds are not hardcoded in TypeScript source files. They are stored in JSON rulesets under `src/rules/india/*.json`:
- Slabs and rate basis-points (`rateBps`).
- Standard deduction amount.
- Section 87A rebate limit, maximum rebate, and marginal relief flag.
- Health and education cess basis-points (400 bps = 4%).
- Source provenance, statutory provisions, and verification status.

The registry loads rulesets by period and regime, and integrity is enforced by `scripts/validate-rules.ts`.

---

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Validate ruleset schemas and integrity
npm run validate-rules

# Verify everything (typecheck + validate-rules + test)
npm run verify

# Build library (ESM, CJS, and DTS)
npm run build

# Dry-run package artifact
npm run pack:check
```

---

## License

MIT © 2026 badalkhandelwal346-ai
