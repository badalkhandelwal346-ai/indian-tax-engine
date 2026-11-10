import { describe, expect, it } from "vitest";
import { runCore } from "../src/core/calculate";
import { paiseToRupees, rupeesToPaise } from "../src/money/money";
import { getRules } from "../src/rules/registry";
import { GOLDEN_CASES } from "./fixtures/golden-cases";

describe("golden cases", () => {
  const periods = ["2025-26", "2026-27"];

  for (const period of periods) {
    describe(`tax period ${period}`, () => {
      for (const golden of GOLDEN_CASES) {
        it(`calculates correctly for ${golden.label} (${period})`, () => {
          const rules = getRules(period, golden.regime);
          const output = runCore({
            salary: rupeesToPaise(golden.salary),
            chapterVIA: 0,
            rules,
          });

          expect(paiseToRupees(output.totalIncome)).toBe(golden.totalIncome);
          expect(paiseToRupees(output.taxPayable)).toBe(golden.payable);

          const slabStep = output.steps.find((s) => s.code === "SLAB_TAX");
          expect(slabStep).toBeDefined();
          expect(slabStep?.amount).toBe(golden.slabTax);
        });
      }
    });
  }
});

