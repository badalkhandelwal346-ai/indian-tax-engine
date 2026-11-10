import { describe, expect, it } from "vitest";
import { calculateTax, type CompleteResult, type StepCode, type TaxInput } from "../src/index";

describe("interaction edge cases", () => {
  const validStepCodes: Set<StepCode> = new Set([
    "GROSS_SALARY",
    "STANDARD_DEDUCTION",
    "CHAPTER_VIA_DEDUCTION",
    "TOTAL_INCOME_ROUNDED",
    "SLAB_TAX",
    "REBATE",
    "MARGINAL_RELIEF",
    "CESS",
    "TAX_PAYABLE_ROUNDED",
  ]);

  it("handles zero salary correctly in both regimes", () => {
    for (const regime of ["new", "old"] as const) {
      const input: TaxInput = {
        taxPeriod: "2026-27",
        regime,
        taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
        income: { salary: 0 },
      };

      const res = calculateTax(input);
      expect(res.status).toBe("complete");
      const comp = res as CompleteResult;
      expect(comp.totalIncome).toBe(0);
      expect(comp.taxPayable).toBe(0);

      const stdDedStep = comp.steps.find((s) => s.code === "STANDARD_DEDUCTION");
      expect(stdDedStep?.amount).toBe(0);
    }
  });

  it("handles salary below standard deduction (salary 40,000 in new regime)", () => {
    const input: TaxInput = {
      taxPeriod: "2026-27",
      regime: "new",
      taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
      income: { salary: 40_000 },
    };

    const res = calculateTax(input);
    expect(res.status).toBe("complete");
    const comp = res as CompleteResult;
    expect(comp.totalIncome).toBe(0);
    expect(comp.taxPayable).toBe(0);

    const stdDedStep = comp.steps.find((s) => s.code === "STANDARD_DEDUCTION");
    expect(stdDedStep?.amount).toBe(40_000);
  });

  it("ensures new regime calculation result is identical with and without chapterVIA except for the warning", () => {
    const baseInput: TaxInput = {
      taxPeriod: "2026-27",
      regime: "new",
      taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
      income: { salary: 1_285_000 },
    };

    const withoutVIA = calculateTax(baseInput) as CompleteResult;
    const withVIA = calculateTax({
      ...baseInput,
      deductions: { chapterVIA: 150_000 },
    }) as CompleteResult;

    expect(withVIA.totalIncome).toBe(withoutVIA.totalIncome);
    expect(withVIA.taxPayable).toBe(withoutVIA.taxPayable);
    expect(withVIA.steps).toEqual(withoutVIA.steps);
    expect(withVIA.appliedRules).toEqual(withoutVIA.appliedRules);
    expect(withVIA.assumptions).toEqual(withoutVIA.assumptions);

    // Only warnings differ (CHAPTER_VIA_NOT_APPLICABLE added)
    expect(withoutVIA.warnings.some((w) => w.code === "CHAPTER_VIA_NOT_APPLICABLE")).toBe(false);
    expect(withVIA.warnings.some((w) => w.code === "CHAPTER_VIA_NOT_APPLICABLE")).toBe(true);
  });

  it("guarantees no surcharge step appears under any circumstances", () => {
    const inputs: TaxInput[] = [
      {
        taxPeriod: "2026-27",
        regime: "new",
        taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
        income: { salary: 5_075_000 },
      },
      {
        taxPeriod: "2026-27",
        regime: "old",
        taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
        income: { salary: 5_050_000 },
      },
      {
        taxPeriod: "2025-26",
        regime: "new",
        taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
        income: { salary: 1_500_000 },
      },
    ];

    for (const input of inputs) {
      const res = calculateTax(input);
      if (res.status === "complete") {
        for (const step of res.steps) {
          expect(validStepCodes.has(step.code)).toBe(true);
          expect((step.code as string).toLowerCase()).not.toContain("surcharge");
        }
      }
    }
  });
});

