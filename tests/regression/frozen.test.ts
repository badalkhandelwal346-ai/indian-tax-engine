// A new tax-period rule file must never change these results for existing periods.

import { describe, expect, it } from "vitest";
import { calculateTax, type CompleteResult, type TaxInput, type TaxPeriod } from "../../src/index";
import { BOUNDARY_CASES } from "../fixtures/boundary-cases";
import { GOLDEN_CASES } from "../fixtures/golden-cases";

describe("frozen regression tests", () => {
  const periods: TaxPeriod[] = ["2025-26", "2026-27"];

  for (const period of periods) {
    describe(`period ${period} frozen values`, () => {
      it("preserves exact golden cases results", () => {
        for (const g of GOLDEN_CASES) {
          const input: TaxInput = {
            jurisdiction: "IN",
            taxPeriod: period,
            regime: g.regime,
            taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
            income: { salary: g.salary },
          };

          const res = calculateTax(input) as CompleteResult;
          expect(res.status).toBe("complete");
          expect(res.totalIncome).toBe(g.totalIncome);
          expect(res.taxPayable).toBe(g.payable);
        }
      });

      it("preserves exact boundary cases results", () => {
        for (const b of BOUNDARY_CASES) {
          const input: TaxInput = {
            jurisdiction: "IN",
            taxPeriod: period,
            regime: b.regime,
            taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
            income: { salary: b.salary },
            ...(b.chapterVIA !== undefined ? { deductions: { chapterVIA: b.chapterVIA } } : {}),
          };

          const res = calculateTax(input) as CompleteResult;
          expect(res.status).toBe("complete");
          expect(res.totalIncome).toBe(b.totalIncome);
          expect(res.taxPayable).toBe(b.payable);
        }
      });
    });
  }
});

