import { describe, expect, it } from "vitest";
import { runCore } from "../src/core/calculate";
import { rupeesToPaise } from "../src/money/money";
import { getRules } from "../src/rules/registry";

describe("calculation trace steps", () => {
  it("generates correct step list for new regime 2026-27 (salary 12,85,000)", () => {
    const rules = getRules("2026-27", "new");
    const output = runCore({
      salary: rupeesToPaise(1_285_000),
      chapterVIA: 0,
      rules,
    });

    const expectedSteps = [
      { code: "GROSS_SALARY", amount: 1_285_000 },
      { code: "STANDARD_DEDUCTION", amount: 75_000 },
      { code: "TOTAL_INCOME_ROUNDED", amount: 1_210_000 },
      { code: "SLAB_TAX", amount: 61_500 },
      { code: "MARGINAL_RELIEF", amount: 51_500 },
      { code: "CESS", amount: 400 },
      { code: "TAX_PAYABLE_ROUNDED", amount: 10_400 },
    ];

    expect(output.steps.length).toBe(expectedSteps.length);

    output.steps.forEach((step, idx) => {
      expect(step.order).toBe(idx + 1);
      expect(step.code).toBe(expectedSteps[idx].code);
      expect(step.amount).toBe(expectedSteps[idx].amount);
      expect(step.ruleId).toBe(`${rules.rulesetVersion}:${expectedSteps[idx].code}`);
    });
  });

  it("generates correct step list for old regime 2026-27 (salary 6,00,000, chapterVIA 0)", () => {
    const rules = getRules("2026-27", "old");
    const output = runCore({
      salary: rupeesToPaise(600_000),
      chapterVIA: 0,
      rules,
    });

    const expectedSteps = [
      { code: "GROSS_SALARY", amount: 600_000 },
      { code: "STANDARD_DEDUCTION", amount: 50_000 },
      { code: "CHAPTER_VIA_DEDUCTION", amount: 0 },
      { code: "TOTAL_INCOME_ROUNDED", amount: 550_000 },
      { code: "SLAB_TAX", amount: 22_500 },
      { code: "CESS", amount: 900 },
      { code: "TAX_PAYABLE_ROUNDED", amount: 23_400 },
    ];

    expect(output.steps.length).toBe(expectedSteps.length);

    output.steps.forEach((step, idx) => {
      expect(step.order).toBe(idx + 1);
      expect(step.code).toBe(expectedSteps[idx].code);
      expect(step.amount).toBe(expectedSteps[idx].amount);
      expect(step.ruleId).toBe(`${rules.rulesetVersion}:${expectedSteps[idx].code}`);
    });

    const stepCodes = output.steps.map((s) => s.code);
    expect(stepCodes).not.toContain("REBATE");
    expect(stepCodes).not.toContain("MARGINAL_RELIEF");
  });
});

