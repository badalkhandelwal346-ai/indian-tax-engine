# Supported Scenarios and Scope

`india-tax-engine` is a prototype library designed for deterministic computation of Indian individual income tax on salary income.

## Supported Tax Periods
- **FY 2025-26** (AY 2026-27), framework `IT_ACT_1961`
- **FY 2026-27** (AY 2027-28), framework `IT_ACT_2025`

## Supported Taxpayer Profile
- **Category**: Individual (`category: "individual"`)
- **Residential Status**: Resident (`residentialStatus: "resident"`)
- **Age Band**: Below 60 (`ageBand: "below-60"`)
- **Income Heads**: Salary only (`income: { salary: <number> }`)

## Deductions
- **Standard Deduction**: Automatically applied per ruleset (Rs 75,000 for New Regime, Rs 50,000 for Old Regime).
- **Chapter VI-A Deductions**: Supported under Old Regime as a declared total (`deductions: { chapterVIA: <number> }`). Ignored under New Regime with an explicit warning (`CHAPTER_VIA_NOT_APPLICABLE`).

## Ceilings and Limitations
- **Maximum Total Income**: Rs 50,00,000 (paise: 500,000,000). Total income exceeding Rs 50,00,000 returns `status: "unsupported"` because surcharge calculation is not implemented.
- **Other Income Heads**: House property, capital gains, business/profession, and other sources are unsupported.
- **Non-residents / Senior Citizens**: Unsupported in this prototype release.

