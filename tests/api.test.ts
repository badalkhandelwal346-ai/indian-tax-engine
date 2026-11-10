import { describe, expect, it } from "vitest";
import {
  calculateTax,
  TaxInputError,
  type CompleteResult,
  type TaxInput,
  type TaxPeriod,
  type UnsupportedResult,
} from "../src/index";
import { GOLDEN_CASES } from "./fixtures/golden-cases";

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (typeof val === "object" && val !== null) {
      deepFreeze(val);
    }
  }
  return obj;
}

describe("calculateTax public API", () => {
  const periods: TaxPeriod[] = ["2025-26", "2026-27"];

  describe("golden cases across tax periods", () => {
    for (const period of periods) {
      for (const golden of GOLDEN_CASES) {
        it(`calculates tax for ${golden.label} (${period})`, () => {
          const input: TaxInput = {
            jurisdiction: "IN",
            taxPeriod: period,
            regime: golden.regime,
            taxpayer: {
              category: "individual",
              residentialStatus: "resident",
              ageBand: "below-60",
            },
            income: { salary: golden.salary },
          };

          const res = calculateTax(input);
          expect(res.status).toBe("complete");
          if (res.status !== "complete") return;

          expect(res.amountUnit).toBe("INR");
          expect(res.totalIncome).toBe(golden.totalIncome);
          expect(res.taxPayable).toBe(golden.payable);
          expect(res.rulesetVersion).toBe(`IN-${period}-${golden.regime}-r1`);

          // appliedRules, steps, assumptions, RULES_NOT_VERIFIED warning
          expect(res.appliedRules.length).toBeGreaterThan(0);
          for (const ar of res.appliedRules) {
            expect(ar.ruleVersion).toBe(res.rulesetVersion);
          }
          expect(res.steps.length).toBeGreaterThan(0);
          expect(res.assumptions.length).toBeGreaterThan(0);
          expect(res.warnings.some((w) => w.code === "RULES_NOT_VERIFIED")).toBe(true);

          // old regime includes RULE_OPEN_CONFLICT; new regime does not
          if (golden.regime === "old") {
            expect(res.warnings.some((w) => w.code === "RULE_OPEN_CONFLICT")).toBe(true);
          } else {
            expect(res.warnings.some((w) => w.code === "RULE_OPEN_CONFLICT")).toBe(false);
          }
        });
      }
    }
  });

  describe("deductions behavior and warnings", () => {
    it("handles old regime salary 8,00,000 with chapterVIA 1,50,000", () => {
      const input: TaxInput = {
        taxPeriod: "2026-27",
        regime: "old",
        taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
        income: { salary: 800_000 },
        deductions: { chapterVIA: 150_000 },
      };

      const res = calculateTax(input) as CompleteResult;
      expect(res.status).toBe("complete");
      expect(res.totalIncome).toBe(600_000);
      expect(res.taxPayable).toBe(33_800);
      expect(res.warnings.some((w) => w.code === "CHAPTER_VIA_ASSUMED_VALID")).toBe(true);
      expect(res.assumptions.some((a) => a.includes("Chapter VI-A"))).toBe(true);
    });

    it("handles old regime salary 3,00,000 with chapterVIA 5,00,000 (capped at income after std ded)", () => {
      const input: TaxInput = {
        taxPeriod: "2026-27",
        regime: "old",
        taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
        income: { salary: 300_000 },
        deductions: { chapterVIA: 500_000 },
      };

      const res = calculateTax(input) as CompleteResult;
      expect(res.status).toBe("complete");
      expect(res.totalIncome).toBe(0);
      expect(res.taxPayable).toBe(0);
      expect(res.warnings.some((w) => w.code === "CHAPTER_VIA_CAPPED")).toBe(true);
    });

    it("handles new regime salary 12,85,000 with chapterVIA 1,50,000 (ignored with warning)", () => {
      const input: TaxInput = {
        taxPeriod: "2026-27",
        regime: "new",
        taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
        income: { salary: 1_285_000 },
        deductions: { chapterVIA: 150_000 },
      };

      const res = calculateTax(input) as CompleteResult;
      expect(res.status).toBe("complete");
      expect(res.taxPayable).toBe(10_400);
      expect(res.warnings.some((w) => w.code === "CHAPTER_VIA_NOT_APPLICABLE")).toBe(true);
    });
  });

  describe("unsupported cases", () => {
    it("returns status unsupported with reasons and NO taxPayable property", () => {
      const unsupportedCases: Partial<TaxInput>[] = [
        { taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "60-to-80" as any } },
        { taxpayer: { category: "individual", residentialStatus: "non-resident" as any, ageBand: "below-60" } },
        { income: { salary: 1_000_000, interest: 50_000 } as any },
        { deductions: { hra: 20_000 } as any },
        { jurisdiction: "US" as any },
      ];

      for (const override of unsupportedCases) {
        const input: TaxInput = {
          jurisdiction: "IN",
          taxPeriod: "2026-27",
          regime: "new",
          taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
          income: { salary: 1_000_000 },
          ...override,
        };

        const res = calculateTax(input);
        expect(res.status).toBe("unsupported");
        expect("taxPayable" in res).toBe(false);
        const unsupp = res as UnsupportedResult;
        expect(unsupp.reasons.length).toBeGreaterThan(0);
      }
    });
  });

  describe("surcharge income ceiling", () => {
    it("completes for new regime salary 50,75,000 (totalIncome 50,00,000)", () => {
      const input: TaxInput = {
        taxPeriod: "2026-27",
        regime: "new",
        taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
        income: { salary: 5_075_000 },
      };

      const res = calculateTax(input);
      expect(res.status).toBe("complete");
    });

    it("returns unsupported UNSUPPORTED_SURCHARGE_RANGE for new regime salary 50,75,005", () => {
      const input: TaxInput = {
        taxPeriod: "2026-27",
        regime: "new",
        taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
        income: { salary: 5_075_005 },
      };

      const res = calculateTax(input);
      expect(res.status).toBe("unsupported");
      const unsupp = res as UnsupportedResult;
      expect(unsupp.reasons.some((r) => r.code === "UNSUPPORTED_SURCHARGE_RANGE")).toBe(true);
      expect("taxPayable" in res).toBe(false);
    });
  });

  describe("error handling and immutability", () => {
    it("throws TaxInputError for malformed input", () => {
      expect(() => calculateTax({} as any)).toThrowError(TaxInputError);
    });

    it("does not mutate a deep-frozen input", () => {
      const input: TaxInput = deepFreeze({
        jurisdiction: "IN",
        taxPeriod: "2026-27",
        regime: "new",
        taxpayer: {
          category: "individual",
          residentialStatus: "resident",
          ageBand: "below-60",
        },
        income: { salary: 1_285_000 },
        deductions: { chapterVIA: 50_000 },
      });

      expect(() => calculateTax(input)).not.toThrow();
    });
  });
});
