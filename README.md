# india-tax-engine

Deterministic, offline Indian income-tax calculator with an explainable trace.

Status: prototype (v0.x). Rules are drafts pending primary-source verification.

---

## Disclaimer

This library produces an informational estimate. It is not tax advice, not suitable for filing a return, and not endorsed by any tax authority. Verify results with the Income Tax Department's official resources or a qualified professional.

---

## Installation

```bash
npm i india-tax-engine
```

---

## Quick Start

### TypeScript / ESM

```ts
import { calculateTax, explain } from "india-tax-engine";

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

console.log(result.totalIncome); // 1210000
console.log(result.taxPayable);  // 10400

console.log(explain(result));
```

### CommonJS

```javascript
const { calculateTax, explain } = require("india-tax-engine");

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

console.log(result.totalIncome); // 1210000
console.log(result.taxPayable);  // 10400

console.log(explain(result));
```

### Real Result Output

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

---

## API Reference

### Exported Functions and Values

- `calculateTax(input: TaxInput): TaxResult`: Computes tax for a specific regime and tax period.
- `compareRegimes(input: CompareInput): CompareResult`: Evaluates both new and old regimes, computing tax under each and identifying the cheaper regime and difference.
- `explain(result: TaxResult | CompareResult): string`: Returns a human-readable, deterministic audit trail.
- `formatINR(rupees: number): string`: Formats a rupee amount into Indian grouped notation with the `₹` symbol (e.g. `1210000` -> `"₹12,10,000"`).
- `SUPPORTED_TAX_PERIODS`: Array of supported tax periods: `["2025-26", "2026-27"]`.
- `TaxInputError`: Custom error class thrown on malformed input.

### Input Types

```ts
export type TaxPeriod = "2025-26" | "2026-27";
export type Regime = "new" | "old";

export interface TaxInput {
  jurisdiction?: "IN";
  taxPeriod: TaxPeriod;
  regime: Regime;
  taxpayer: {
    category: "individual";
    residentialStatus: "resident";
    ageBand: "below-60";
  };
  income: {
    salary: number;
  };
  deductions?: {
    chapterVIA?: number;
  };
}

export type CompareInput = Omit<TaxInput, "regime">;
```

### Result Types

```ts
export interface Step {
  order: number;
  code: StepCode;
  ruleId: string;
  amount: number;
}

export interface Warning {
  code: string;
  message: string;
}

export interface CompleteResult {
  status: "complete";
  amountUnit: "INR";
  taxPeriod: TaxPeriod;
  regime: Regime;
  rulesetVersion: string;
  totalIncome: number;
  taxPayable: number;
  steps: Step[];
  appliedRules: { ruleId: string; ruleVersion: string }[];
  assumptions: string[];
  warnings: Warning[];
}

export interface Reason {
  code: string;
  message: string;
  field?: string;
}

export interface UnsupportedResult {
  status: "unsupported";
  reasons: Reason[];
}

export type TaxResult = CompleteResult | UnsupportedResult;

export interface RegimeComparison {
  status: "complete";
  taxPeriod: TaxPeriod;
  new: CompleteResult;
  old: CompleteResult;
  cheaper: Regime | "equal";
  difference: number;
}

export type CompareResult = RegimeComparison | UnsupportedResult;
```

### The Two Failure Modes

1. **Malformed Input (Throws `TaxInputError`)**:
   Input that violates structural schema or number bounds throws a `TaxInputError`. Stable error codes:
   - `INVALID_INPUT`: Malformed payload, non-object, unknown top-level key, or type error.
   - `MISSING_FIELD`: A required field is missing.
   - `INVALID_NUMBER`: Number is not finite (e.g. `NaN`, `Infinity`).
   - `NEGATIVE_AMOUNT`: Amount is negative.
   - `TOO_MANY_DECIMALS`: Number contains more than 2 decimal places.
   - `AMOUNT_TOO_LARGE`: Amount exceeds ₹1,000 crore limit (`10_000_000_000`).
   - `UNKNOWN_TAX_PERIOD`: Tax period is not in `SUPPORTED_TAX_PERIODS`.
   - `UNKNOWN_REGIME`: Regime is not `"new"` or `"old"`.

2. **Valid-but-Unsupported Input (Returns `{ status: "unsupported", reasons: [...] }`)**:
   Input that is valid JSON and well-formed but describes a profile outside the engine's scope returns an `UnsupportedResult`. Never throws. Reason codes include `UNSUPPORTED_JURISDICTION`, `UNSUPPORTED_TAXPAYER_CATEGORY`, `UNSUPPORTED_RESIDENTIAL_STATUS`, `UNSUPPORTED_AGE_BAND`, `UNSUPPORTED_INCOME_HEAD`, `UNSUPPORTED_DEDUCTION`, and `UNSUPPORTED_SURCHARGE_RANGE`.

### Units, Rounding, and Reproducibility

- **Units**: The public API consumes and returns Indian Rupees (INR) with up to 2 decimal places. Internally, all arithmetic is executed on integer paise (`1 rupee = 100 paise`).
- **Two ₹10 Rounding Stages**:
  1. *Total income rounding*: Statutory rounding to the nearest ₹10 pursuant to Section 288A (IT Act 1961) / Section 516 (IT Act 2025). Paise are discarded first; remaining rupees ending in 5 or more round up to the next multiple of 10.
  2. *Tax payable rounding*: Statutory rounding of payable tax (tax + cess) to the nearest ₹10 pursuant to Section 288B (IT Act 1961) / Section 516 (IT Act 2025).
- **Reproducibility**: Every `CompleteResult` includes a `rulesetVersion` string (such as `IN-2026-27-new-r1`) and an `appliedRules` list linking each computation step back to its underlying rule definition.

---

## Support Matrix

| Supported | Not Supported |
| :--- | :--- |
| Resident individual below 60 | Surcharge and total income above ₹50,00,000 |
| Salary income only (`income.salary`) | Capital gains, House property, Business/profession, Other sources |
| New and old regimes | Non-resident individuals (NRIs), RNOR |
| Tax periods `2025-26` and `2026-27` | Senior citizens (60-79) and super seniors (80+) |
| Standard deduction (automatic: ₹75,000 new / ₹50,000 old) | HRA exemptions |
| Section 87A rebate | Other deductions including employer NPS (Section 80CCD) |
| Marginal relief on the new-regime rebate | Goods and Services Tax (GST) |
| 4% Health and Education Cess | Other countries / foreign jurisdictions |
| Two-stage statutory ₹10 rounding | |
| Chapter VI-A as one declared total in the old regime | |
| Regime comparison (`compareRegimes`) | |

---

## Known Limitations

- **Rules are Drafts**: Rule sets have not yet undergone primary-source verification and carry status `"draft"` with verification label `"secondary-corroborated"` or `"open-conflict"`.
- **Old-Regime Marginal Relief Conflict**: Authoritative secondary sources conflict on whether statutory marginal relief applies to the Section 87A rebate in the old regime. The engine follows the majority reading (no marginal relief in the old regime, creating a tax cliff at ₹5,00,000) and emits a `RULE_OPEN_CONFLICT` warning.
- **Chapter VI-A Total Not Validated**: Chapter VI-A deductions under the old regime are accepted as a declared sum; individual section caps (e.g. ₹1,50,000 under 80C) and eligibility rules are not validated by the engine.
- **Per-Slab Floor**: Each slab bracket's tax is floored to integer paise (`applyBps`), which avoids fractional paise accumulation.
- **No Surcharge**: Surcharge brackets and surcharge marginal relief formulas are not implemented; incomes resulting in total income exceeding ₹50,00,000 return `status: "unsupported"`.

---

## How Rules Work

Tax rates, slab thresholds, rebate maximums, and statutory parameters are never hardcoded in TypeScript source files.
- **Rules as JSON**: All tax rules are stored in versioned JSON documents under `src/rules/india/` (e.g. `2025-26.json`, `2026-27.json`).
- **Provenance and Verification Labels**: Each rule includes provenance metadata (`ruleId`, `provision`, `url`, `retrievedOn`, `verification`). Verification states include `"draft"`, `"secondary-corroborated"`, and `"open-conflict"`.
- **Bundled and Offline**: Rule files are bundled directly into the distribution output.
- **No Network, Zero Runtime Dependencies**: The engine performs no runtime file system access, network requests, clock lookups, or random number generation.

---

## Development

```bash
# Run tests
npm test

# Type check
npm run typecheck

# Validate ruleset schema and integrity
npm run validate-rules

# Build distribution artifacts
npm run build

# Run all checks (typecheck + validate-rules + test)
npm run verify
```

---

## License

MIT © 2026 badalkhandelwal346-ai
