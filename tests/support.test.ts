import { describe, expect, it } from "vitest";
import { getRules } from "../src/rules/registry";
import { checkIncomeCeiling, checkProfileSupport } from "../src/validation/support";
import type { ValidatedInput } from "../src/validation/validate";

describe("checkProfileSupport", () => {
  const getSupportedInput = (): ValidatedInput => ({
    jurisdiction: "IN",
    taxPeriod: "2026-27",
    regime: "new",
    taxpayer: {
      category: "individual",
      residentialStatus: "resident",
      ageBand: "below-60",
    },
    salary: 128_500_000,
    chapterVIA: 0,
    extraIncomeKeys: [],
    extraDeductionKeys: [],
  });

  it("returns an empty reason list for fully supported profiles", () => {
    const reasons = checkProfileSupport(getSupportedInput());
    expect(reasons).toEqual([]);
  });

  it("reports unsupported profile fields with exact codes and field names", () => {
    // ageBand
    const badAge = {
      ...getSupportedInput(),
      taxpayer: { ...getSupportedInput().taxpayer, ageBand: "60-to-80" },
    };
    expect(checkProfileSupport(badAge)).toEqual([
      {
        code: "UNSUPPORTED_AGE_BAND",
        message: 'Age band "60-to-80" is not supported; only "below-60" is.',
        field: "taxpayer.ageBand",
      },
    ]);

    // residentialStatus
    const badResident = {
      ...getSupportedInput(),
      taxpayer: { ...getSupportedInput().taxpayer, residentialStatus: "non-resident" },
    };
    expect(checkProfileSupport(badResident)).toEqual([
      {
        code: "UNSUPPORTED_RESIDENTIAL_STATUS",
        message: 'Residential status "non-resident" is not supported; only "resident" is.',
        field: "taxpayer.residentialStatus",
      },
    ]);

    // category
    const badCategory = {
      ...getSupportedInput(),
      taxpayer: { ...getSupportedInput().taxpayer, category: "huf" },
    };
    expect(checkProfileSupport(badCategory)).toEqual([
      {
        code: "UNSUPPORTED_TAXPAYER_CATEGORY",
        message: 'Taxpayer category "huf" is not supported; only "individual" is.',
        field: "taxpayer.category",
      },
    ]);

    // jurisdiction
    const badJurisdiction = {
      ...getSupportedInput(),
      jurisdiction: "US",
    };
    expect(checkProfileSupport(badJurisdiction)).toEqual([
      {
        code: "UNSUPPORTED_JURISDICTION",
        message: 'Jurisdiction "US" is not supported; only "IN" is.',
        field: "jurisdiction",
      },
    ]);
  });

  it("reports unsupported extra income heads and deductions", () => {
    // extra income key "interest"
    const withInterest = {
      ...getSupportedInput(),
      extraIncomeKeys: ["interest"],
    };
    expect(checkProfileSupport(withInterest)).toEqual([
      {
        code: "UNSUPPORTED_INCOME_HEAD",
        message: 'Income head "interest" is not supported; only salary is.',
        field: "income.interest",
      },
    ]);

    // deductions key "hra"
    const withHra = {
      ...getSupportedInput(),
      extraDeductionKeys: ["hra"],
    };
    expect(checkProfileSupport(withHra)).toEqual([
      {
        code: "UNSUPPORTED_DEDUCTION",
        message: 'Deduction "hra" is not supported; only chapterVIA (declared total, old regime) is.',
        field: "deductions.hra",
      },
    ]);

    // employer NPS style key "employerNPS"
    const withNps = {
      ...getSupportedInput(),
      extraDeductionKeys: ["employerNPS"],
    };
    expect(checkProfileSupport(withNps)).toEqual([
      {
        code: "UNSUPPORTED_DEDUCTION",
        message: 'Deduction "employerNPS" is not supported; only chapterVIA (declared total, old regime) is.',
        field: "deductions.employerNPS",
      },
    ]);
  });

  it("returns all reasons when multiple unsupported problems occur at once", () => {
    const multiBad: ValidatedInput = {
      jurisdiction: "US",
      taxPeriod: "2026-27",
      regime: "new",
      taxpayer: {
        category: "huf",
        residentialStatus: "non-resident",
        ageBand: "60-to-80",
      },
      salary: 100_000_00,
      chapterVIA: 0,
      extraIncomeKeys: ["business", "capitalGains"],
      extraDeductionKeys: ["80D", "hra"],
    };

    const reasons = checkProfileSupport(multiBad);
    expect(reasons.length).toBe(8);
    expect(reasons.map((r) => r.code)).toEqual([
      "UNSUPPORTED_JURISDICTION",
      "UNSUPPORTED_TAXPAYER_CATEGORY",
      "UNSUPPORTED_RESIDENTIAL_STATUS",
      "UNSUPPORTED_AGE_BAND",
      "UNSUPPORTED_INCOME_HEAD",
      "UNSUPPORTED_INCOME_HEAD",
      "UNSUPPORTED_DEDUCTION",
      "UNSUPPORTED_DEDUCTION",
    ]);
  });
});

describe("checkIncomeCeiling", () => {
  for (const regime of ["new", "old"] as const) {
    describe(`${regime} regime`, () => {
      const rules = getRules("2026-27", regime);

      it("permits totalIncome equal to Rs 50,00,000", () => {
        const ceilingPaise = 5_000_000 * 100; // 5_000_000_00 paise
        expect(checkIncomeCeiling(ceilingPaise, rules)).toEqual([]);
      });

      it("returns UNSUPPORTED_SURCHARGE_RANGE for totalIncome above Rs 50,00,000", () => {
        const aboveCeilingPaise = 5_000_010 * 100;
        const reasons = checkIncomeCeiling(aboveCeilingPaise, rules);

        expect(reasons.length).toBe(1);
        expect(reasons[0].code).toBe("UNSUPPORTED_SURCHARGE_RANGE");
        expect(reasons[0].field).toBe("income.salary");
        expect(reasons[0].message).toContain("50,00,000");
        expect(reasons[0].message).toContain(regime);
        expect(reasons[0].message).toBe(
          `Under the ${regime} regime, total income above Rs 50,00,000 attracts surcharge, which this version does not support.`,
        );
      });
    });
  }
});

