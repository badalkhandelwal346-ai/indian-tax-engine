import { describe, expect, it } from "vitest";
import { calculateTax, type CompleteResult, type TaxInput, type UnsupportedResult } from "../src/index";

describe("surcharge income ceiling boundaries", () => {
  describe("new regime ceiling behavior", () => {
    it("completes for salary 50,75,000 and 50,75,004 (total income <= 50L after rounding)", () => {
      for (const salary of [5_075_000, 5_075_004]) {
        const input: TaxInput = {
          taxPeriod: "2026-27",
          regime: "new",
          taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
          income: { salary },
        };
        const res = calculateTax(input);
        expect(res.status).toBe("complete");
        expect((res as CompleteResult).totalIncome).toBe(5_000_000);
      }
    });

    it("returns unsupported with UNSUPPORTED_SURCHARGE_RANGE for salary 50,75,005 and 50,75,010", () => {
      for (const salary of [5_075_005, 5_075_010]) {
        const input: TaxInput = {
          taxPeriod: "2026-27",
          regime: "new",
          taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
          income: { salary },
        };
        const res = calculateTax(input);
        expect(res.status).toBe("unsupported");
        const unsupp = res as UnsupportedResult;
        expect(unsupp.reasons.some((r) => r.code === "UNSUPPORTED_SURCHARGE_RANGE")).toBe(true);
      }
    });
  });

  describe("old regime ceiling behavior", () => {
    it("completes for salary 50,50,000 (total income = 50L)", () => {
      const input: TaxInput = {
        taxPeriod: "2026-27",
        regime: "old",
        taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
        income: { salary: 5_050_000 },
      };
      const res = calculateTax(input);
      expect(res.status).toBe("complete");
      expect((res as CompleteResult).totalIncome).toBe(5_000_000);
    });

    it("returns unsupported for salary 50,50,005 (total income rounds up to 50,00,010)", () => {
      const input: TaxInput = {
        taxPeriod: "2026-27",
        regime: "old",
        taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
        income: { salary: 5_050_005 },
      };
      const res = calculateTax(input);
      expect(res.status).toBe("unsupported");
      const unsupp = res as UnsupportedResult;
      expect(unsupp.reasons.some((r) => r.code === "UNSUPPORTED_SURCHARGE_RANGE")).toBe(true);
    });

    it("completes when large chapterVIA brings total income below ceiling (salary 60,00,000, chapterVIA 10,00,000)", () => {
      const input: TaxInput = {
        taxPeriod: "2026-27",
        regime: "old",
        taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
        income: { salary: 6_000_000 },
        deductions: { chapterVIA: 1_000_000 },
      };
      const res = calculateTax(input);
      expect(res.status).toBe("complete");
      const comp = res as CompleteResult;
      expect(comp.totalIncome).toBe(4_950_000);
      expect(comp.taxPayable).toBeGreaterThan(0);
    });
  });
});
