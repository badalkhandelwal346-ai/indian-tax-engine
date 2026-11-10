# Supported Scenarios and Support Matrix

`india-tax-engine` is an offline prototype library for Indian individual income tax calculation. It strictly enforces a scope boundary and returns structured reasons when an input falls outside supported scope.

---

## Support Matrix

| Category | Supported | Not Supported |
| :--- | :--- | :--- |
| **Tax Period** | `2025-26` (FY 2025-26 / AY 2026-27), `2026-27` (FY 2026-27 / AY 2027-28) | Any other tax period (e.g. `2024-25`, `2027-28`) |
| **Jurisdiction** | India (`"IN"`, default) | Any other country/jurisdiction |
| **Taxpayer Category** | Individual (`"individual"`) | HUF (`"huf"`), Firm, Company, AOP, BOI |
| **Residential Status** | Resident (`"resident"`) | Non-Resident (`"non-resident"`), RNOR |
| **Age Band** | Below 60 (`"below-60"`) | Senior citizens (`"60-to-79"`), Super seniors (`"80-and-above"`) |
| **Income Heads** | Salary only (`income.salary`) | House property, Business/Profession, Capital gains, Other sources |
| **Deductions** | Standard deduction (automatic: ₹75,000 new / ₹50,000 old), Chapter VI-A total (`deductions.chapterVIA`, old regime only) | Section-specific deductions (80C, 80D, 80G, 80CCD employer NPS), HRA exemption |
| **Income Ceiling** | Total income up to ₹50,00,000 | Total income above ₹50,00,000 (surcharge range) |
| **Regimes** | New regime (`"new"`), Old regime (`"old"`) | Any custom or deprecated tax regime |

---

## Supported Input Examples (Real Execution)

### 1. New Regime, FY 2026-27 (Salary ₹12,85,000)

**Input:**
```json
{
  "taxPeriod": "2026-27",
  "regime": "new",
  "taxpayer": {
    "category": "individual",
    "residentialStatus": "resident",
    "ageBand": "below-60"
  },
  "income": { "salary": 1285000 }
}
```

**Output:**
```json
{
  "status": "complete",
  "amountUnit": "INR",
  "taxPeriod": "2026-27",
  "regime": "new",
  "rulesetVersion": "IN-2026-27-new-r1",
  "totalIncome": 1210000,
  "taxPayable": 10400,
  "steps": [
    {
      "order": 1,
      "code": "GROSS_SALARY",
      "ruleId": "IN-2026-27-new-r1:GROSS_SALARY",
      "amount": 1285000
    },
    {
      "order": 2,
      "code": "STANDARD_DEDUCTION",
      "ruleId": "IN-2026-27-new-r1:STANDARD_DEDUCTION",
      "amount": 75000
    },
    {
      "order": 3,
      "code": "TOTAL_INCOME_ROUNDED",
      "ruleId": "IN-2026-27-new-r1:TOTAL_INCOME_ROUNDED",
      "amount": 1210000
    },
    {
      "order": 4,
      "code": "SLAB_TAX",
      "ruleId": "IN-2026-27-new-r1:SLAB_TAX",
      "amount": 61500
    },
    {
      "order": 5,
      "code": "MARGINAL_RELIEF",
      "ruleId": "IN-2026-27-new-r1:MARGINAL_RELIEF",
      "amount": 51500
    },
    {
      "order": 6,
      "code": "CESS",
      "ruleId": "IN-2026-27-new-r1:CESS",
      "amount": 400
    },
    {
      "order": 7,
      "code": "TAX_PAYABLE_ROUNDED",
      "ruleId": "IN-2026-27-new-r1:TAX_PAYABLE_ROUNDED",
      "amount": 10400
    }
  ],
  "appliedRules": [
    {
      "ruleId": "IN-26-N-SLAB",
      "ruleVersion": "IN-2026-27-new-r1"
    },
    {
      "ruleId": "IN-26-N-STDDED",
      "ruleVersion": "IN-2026-27-new-r1"
    },
    {
      "ruleId": "IN-26-N-REBATE",
      "ruleVersion": "IN-2026-27-new-r1"
    },
    {
      "ruleId": "IN-26-N-CESS",
      "ruleVersion": "IN-2026-27-new-r1"
    },
    {
      "ruleId": "IN-26-N-ROUND",
      "ruleVersion": "IN-2026-27-new-r1"
    }
  ],
  "assumptions": [
    "Resident individual below 60 with salary income only.",
    "Income is gross annual salary; the ruleset's standard deduction is applied automatically.",
    "Informational estimate only; not tax advice and not suitable for filing."
  ],
  "warnings": [
    {
      "code": "RULES_NOT_VERIFIED",
      "message": "Ruleset IN-2026-27-new-r1 has status \"draft\"; figures are not confirmed against primary sources."
    }
  ]
}
```

---

### 2. Old Regime with Chapter VI-A Deductions, FY 2026-27 (Salary ₹8,00,000, 80C ₹1,50,000)

**Input:**
```json
{
  "taxPeriod": "2026-27",
  "regime": "old",
  "taxpayer": {
    "category": "individual",
    "residentialStatus": "resident",
    "ageBand": "below-60"
  },
  "income": { "salary": 800000 },
  "deductions": { "chapterVIA": 150000 }
}
```

**Output:**
```json
{
  "status": "complete",
  "amountUnit": "INR",
  "taxPeriod": "2026-27",
  "regime": "old",
  "rulesetVersion": "IN-2026-27-old-r1",
  "totalIncome": 600000,
  "taxPayable": 33800,
  "steps": [
    {
      "order": 1,
      "code": "GROSS_SALARY",
      "ruleId": "IN-2026-27-old-r1:GROSS_SALARY",
      "amount": 800000
    },
    {
      "order": 2,
      "code": "STANDARD_DEDUCTION",
      "ruleId": "IN-2026-27-old-r1:STANDARD_DEDUCTION",
      "amount": 50000
    },
    {
      "order": 3,
      "code": "CHAPTER_VIA_DEDUCTION",
      "ruleId": "IN-2026-27-old-r1:CHAPTER_VIA_DEDUCTION",
      "amount": 150000
    },
    {
      "order": 4,
      "code": "TOTAL_INCOME_ROUNDED",
      "ruleId": "IN-2026-27-old-r1:TOTAL_INCOME_ROUNDED",
      "amount": 600000
    },
    {
      "order": 5,
      "code": "SLAB_TAX",
      "ruleId": "IN-2026-27-old-r1:SLAB_TAX",
      "amount": 32500
    },
    {
      "order": 6,
      "code": "CESS",
      "ruleId": "IN-2026-27-old-r1:CESS",
      "amount": 1300
    },
    {
      "order": 7,
      "code": "TAX_PAYABLE_ROUNDED",
      "ruleId": "IN-2026-27-old-r1:TAX_PAYABLE_ROUNDED",
      "amount": 33800
    }
  ],
  "appliedRules": [
    {
      "ruleId": "IN-26-O-SLAB",
      "ruleVersion": "IN-2026-27-old-r1"
    },
    {
      "ruleId": "IN-26-O-STDDED",
      "ruleVersion": "IN-2026-27-old-r1"
    },
    {
      "ruleId": "IN-26-O-REBATE",
      "ruleVersion": "IN-2026-27-old-r1"
    },
    {
      "ruleId": "IN-26-O-CESS",
      "ruleVersion": "IN-2026-27-old-r1"
    },
    {
      "ruleId": "IN-26-O-ROUND",
      "ruleVersion": "IN-2026-27-old-r1"
    }
  ],
  "assumptions": [
    "Resident individual below 60 with salary income only.",
    "Income is gross annual salary; the ruleset's standard deduction is applied automatically.",
    "Informational estimate only; not tax advice and not suitable for filing.",
    "Chapter VI-A deductions were taken as a declared total."
  ],
  "warnings": [
    {
      "code": "RULES_NOT_VERIFIED",
      "message": "Ruleset IN-2026-27-old-r1 has status \"draft\"; figures are not confirmed against primary sources."
    },
    {
      "code": "RULE_OPEN_CONFLICT",
      "message": "Rule IN-26-O-REBATE has an unresolved source conflict (s.156 Income-tax Act 2025 - TO CONFIRM; old-regime marginal relief: sources conflict, majority says none)."
    },
    {
      "code": "CHAPTER_VIA_ASSUMED_VALID",
      "message": "The declared Chapter VI-A total was applied as given; section caps and eligibility are not validated."
    }
  ]
}
```

---

## Unsupported Reason Code Examples (Real Execution)

When an input is structurally valid but falls outside the engine's supported profile, `calculateTax` and `compareRegimes` do not throw an error; they return `{ status: "unsupported", reasons: [...] }`.

### 1. `UNSUPPORTED_JURISDICTION`

**Input:**
```json
{
  "jurisdiction": "US",
  "taxPeriod": "2026-27",
  "regime": "new",
  "taxpayer": { "category": "individual", "residentialStatus": "resident", "ageBand": "below-60" },
  "income": { "salary": 1000000 }
}
```

**Output:**
```json
{
  "status": "unsupported",
  "reasons": [
    {
      "code": "UNSUPPORTED_JURISDICTION",
      "message": "Jurisdiction \"US\" is not supported; only \"IN\" is.",
      "field": "jurisdiction"
    }
  ]
}
```

---

### 2. `UNSUPPORTED_TAXPAYER_CATEGORY`

**Input:**
```json
{
  "taxPeriod": "2026-27",
  "regime": "new",
  "taxpayer": { "category": "huf", "residentialStatus": "resident", "ageBand": "below-60" },
  "income": { "salary": 1000000 }
}
```

**Output:**
```json
{
  "status": "unsupported",
  "reasons": [
    {
      "code": "UNSUPPORTED_TAXPAYER_CATEGORY",
      "message": "Taxpayer category \"huf\" is not supported; only \"individual\" is.",
      "field": "taxpayer.category"
    }
  ]
}
```

---

### 3. `UNSUPPORTED_RESIDENTIAL_STATUS`

**Input:**
```json
{
  "taxPeriod": "2026-27",
  "regime": "new",
  "taxpayer": { "category": "individual", "residentialStatus": "non-resident", "ageBand": "below-60" },
  "income": { "salary": 1000000 }
}
```

**Output:**
```json
{
  "status": "unsupported",
  "reasons": [
    {
      "code": "UNSUPPORTED_RESIDENTIAL_STATUS",
      "message": "Residential status \"non-resident\" is not supported; only \"resident\" is.",
      "field": "taxpayer.residentialStatus"
    }
  ]
}
```

---

### 4. `UNSUPPORTED_AGE_BAND`

**Input:**
```json
{
  "taxPeriod": "2026-27",
  "regime": "new",
  "taxpayer": { "category": "individual", "residentialStatus": "resident", "ageBand": "60-to-79" },
  "income": { "salary": 1000000 }
}
```

**Output:**
```json
{
  "status": "unsupported",
  "reasons": [
    {
      "code": "UNSUPPORTED_AGE_BAND",
      "message": "Age band \"60-to-79\" is not supported; only \"below-60\" is.",
      "field": "taxpayer.ageBand"
    }
  ]
}
```

---

### 5. `UNSUPPORTED_INCOME_HEAD`

**Input:**
```json
{
  "taxPeriod": "2026-27",
  "regime": "new",
  "taxpayer": { "category": "individual", "residentialStatus": "resident", "ageBand": "below-60" },
  "income": { "salary": 1000000, "houseProperty": 200000 }
}
```

**Output:**
```json
{
  "status": "unsupported",
  "reasons": [
    {
      "code": "UNSUPPORTED_INCOME_HEAD",
      "message": "Income head \"houseProperty\" is not supported; only salary is.",
      "field": "income.houseProperty"
    }
  ]
}
```

---

### 6. `UNSUPPORTED_DEDUCTION`

**Input:**
```json
{
  "taxPeriod": "2026-27",
  "regime": "old",
  "taxpayer": { "category": "individual", "residentialStatus": "resident", "ageBand": "below-60" },
  "income": { "salary": 1000000 },
  "deductions": { "chapterVIA": 150000, "section80D": 25000 }
}
```

**Output:**
```json
{
  "status": "unsupported",
  "reasons": [
    {
      "code": "UNSUPPORTED_DEDUCTION",
      "message": "Deduction \"section80D\" is not supported; only chapterVIA (declared total, old regime) is.",
      "field": "deductions.section80D"
    }
  ]
}
```

---

### 7. `UNSUPPORTED_SURCHARGE_RANGE`

**Input:**
```json
{
  "taxPeriod": "2026-27",
  "regime": "new",
  "taxpayer": { "category": "individual", "residentialStatus": "resident", "ageBand": "below-60" },
  "income": { "salary": 6000000 }
}
```

**Output:**
```json
{
  "status": "unsupported",
  "reasons": [
    {
      "code": "UNSUPPORTED_SURCHARGE_RANGE",
      "message": "Under the new regime, total income above Rs 50,00,000 attracts surcharge, which this version does not support.",
      "field": "income.salary"
    }
  ]
}
```
