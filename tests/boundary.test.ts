import { describe, expect, it } from "vitest";
import { calculateTax, type CompleteResult, type TaxInput, type TaxPeriod } from "../src/index";
import { BOUNDARY_CASES } from "./fixtures/boundary-cases";

describe("boundary cases across tax periods", () => {
  const periods: TaxPeriod[] = ["2025-26", "2026-27"];

  for (const period of periods) {
    describe(`tax period ${period}`, () => {
      for (const b of BOUNDARY_CASES) {
        it(`calculates correctly for boundary case "${b.label}" (${period})`, () => {
          const input: TaxInput = {
            jurisdiction: "IN",
            taxPeriod: period,
            regime: b.regime,
            taxpayer: {
              category: "individual",
              residentialStatus: "resident",
              ageBand: "below-60",
            },
            income: { salary: b.salary },
            ...(b.chapterVIA !== undefined ? { deductions: { chapterVIA: b.chapterVIA } } : {}),
          };

          const res = calculateTax(input);
          expect(res.status).toBe("complete");
          if (res.status !== "complete") return;

          expect(res.totalIncome).toBe(b.totalIncome);
          expect(res.taxPayable).toBe(b.payable);
        });
      }
    });
  }
});

