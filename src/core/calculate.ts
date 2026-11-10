import { applyBps, paiseToRupees, roundToNearestTen, type Paise } from "../money/money";
import type { RegimeRules } from "../rules/types";
import { slabTax } from "./slab";

export type StepCode =
  | "GROSS_SALARY"
  | "STANDARD_DEDUCTION"
  | "CHAPTER_VIA_DEDUCTION"
  | "TOTAL_INCOME_ROUNDED"
  | "SLAB_TAX"
  | "REBATE"
  | "MARGINAL_RELIEF"
  | "CESS"
  | "TAX_PAYABLE_ROUNDED";

export interface Step {
  order: number;
  code: StepCode;
  ruleId: string;
  amount: number;
} // amount in INR rupees

export interface CoreArgs {
  salary: Paise;
  chapterVIA: Paise;
  rules: RegimeRules;
}

export interface TotalIncomeParts {
  standardDeduction: Paise;
  chapterVIAApplied: Paise;
  totalIncome: Paise; // rounded to nearest Rs 10
}

export function computeTotalIncome({ salary, chapterVIA, rules }: CoreArgs): TotalIncomeParts {
  const standardDeduction = Math.min(salary, rules.standardDeduction * 100);
  const chapterVIAApplied =
    rules.regime === "old" ? Math.min(salary - standardDeduction, chapterVIA) : 0;
  const rawIncome = Math.max(0, salary - standardDeduction - chapterVIAApplied);
  return { standardDeduction, chapterVIAApplied, totalIncome: roundToNearestTen(rawIncome) };
}

export interface CoreOutput {
  totalIncome: Paise;
  taxPayable: Paise;
  steps: Step[];
}

export function runCore(args: CoreArgs): CoreOutput {
  const { salary, rules } = args;
  const steps: Step[] = [];
  const add = (code: StepCode, amount: Paise): void => {
    steps.push({
      order: steps.length + 1,
      code,
      ruleId: `${rules.rulesetVersion}:${code}`,
      amount: paiseToRupees(amount),
    });
  };

  const ti = computeTotalIncome(args);
  add("GROSS_SALARY", salary);
  add("STANDARD_DEDUCTION", ti.standardDeduction);
  if (rules.regime === "old") add("CHAPTER_VIA_DEDUCTION", ti.chapterVIAApplied);
  add("TOTAL_INCOME_ROUNDED", ti.totalIncome);

  const slab = slabTax(ti.totalIncome, rules.slabs);
  add("SLAB_TAX", slab);

  let tax = slab;
  const limit = rules.rebate.incomeLimit * 100;
  if (ti.totalIncome <= limit) {
    const rebate = Math.min(slab, rules.rebate.max * 100);
    tax = slab - rebate;
    add("REBATE", rebate);
  } else if (rules.rebate.marginalRelief) {
    const capped = Math.min(slab, ti.totalIncome - limit);
    add("MARGINAL_RELIEF", slab - capped);
    tax = capped;
  }

  const cess = applyBps(tax, rules.cessBps);
  add("CESS", cess);

  const taxPayable = roundToNearestTen(tax + cess);
  add("TAX_PAYABLE_ROUNDED", taxPayable);

  return { totalIncome: ti.totalIncome, taxPayable, steps };
}
