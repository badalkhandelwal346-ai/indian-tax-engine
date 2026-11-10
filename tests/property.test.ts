import { describe, expect, it } from "vitest";
import {
  calculateTax,
  type CompleteResult,
  type Regime,
  type TaxInput,
  type TaxPeriod,
  type UnsupportedResult,
} from "../src/index";

describe("property-based fuzzing and invariant tests", () => {
  // Deterministic LCG pseudo-random generator
  let s = 12345;
  const rand = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;

  // Generate 500 salaries in [0, 60,00,000], ~half with 2-decimal paise
  const salaries: number[] = [];
  for (let i = 0; i < 500; i++) {
    const wholeRupees = Math.floor(rand() * 6_000_001); // 0 to 60,00,000
    const hasPaise = rand() < 0.5;
    const paise = hasPaise ? Math.floor(rand() * 100) : 0;
    salaries.push(Number((wholeRupees + paise / 100).toFixed(2)));
  }

  const periods: TaxPeriod[] = ["2025-26", "2026-27"];
  const regimes: Regime[] = ["new", "old"];

  for (const period of periods) {
    for (const regime of regimes) {
      describe(`invariants for ${period} ${regime}`, () => {
        it("satisfies mathematical and structural invariants across 500 generated salaries", () => {
          for (const salary of salaries) {
            const input: TaxInput = {
              jurisdiction: "IN",
              taxPeriod: period,
              regime,
              taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
              income: { salary },
            };

            const res1 = calculateTax(input);
            const res2 = calculateTax(input);

            // Determinism
            expect(res1).toEqual(res2);

            if (res1.status === "complete") {
              const comp = res1 as CompleteResult;

              // Bounds
              expect(comp.taxPayable).toBeGreaterThanOrEqual(0);
              expect(comp.totalIncome).toBeGreaterThanOrEqual(0);
              expect(comp.totalIncome).toBeLessThanOrEqual(salary);

              // Multiples of Rs 10 (statutory rounding)
              expect((Math.round(comp.taxPayable * 100)) % 1000).toBe(0);
              expect((Math.round(comp.totalIncome * 100)) % 1000).toBe(0);

              // Steps integrity
              expect(comp.steps.length).toBeGreaterThan(0);
              comp.steps.forEach((step, idx) => {
                expect(step.order).toBe(idx + 1);
                expect(step.amount).toBeGreaterThanOrEqual(0);
              });
              const lastStep = comp.steps[comp.steps.length - 1];
              expect(lastStep.code).toBe("TAX_PAYABLE_ROUNDED");
              expect(lastStep.amount).toBe(comp.taxPayable);

              // Metadata consistency
              expect(comp.regime).toBe(regime);
              expect(comp.taxPeriod).toBe(period);
              expect(comp.rulesetVersion).toMatch(/^IN-\d{4}-\d{2}-(new|old)-r\d+$/);
            } else {
              // Unsupported cases in this test loop can only be due to surcharge ceiling
              const unsupp = res1 as UnsupportedResult;
              expect(unsupp.reasons.length).toBeGreaterThan(0);
              expect(unsupp.reasons.every((r) => r.code === "UNSUPPORTED_SURCHARGE_RANGE")).toBe(true);
            }
          }
        });

        it("maintains monotonicity of taxPayable as salary increases", () => {
          const sortedSalaries = [...salaries].sort((a, b) => a - b);
          let prevTax = 0;

          for (const salary of sortedSalaries) {
            const input: TaxInput = {
              jurisdiction: "IN",
              taxPeriod: period,
              regime,
              taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
              income: { salary },
            };

            const res = calculateTax(input);
            if (res.status === "complete") {
              expect(res.taxPayable).toBeGreaterThanOrEqual(prevTax);
              prevTax = res.taxPayable;
            }
          }
        });
      });
    }
  }
});

