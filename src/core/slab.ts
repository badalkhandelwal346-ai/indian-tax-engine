import { applyBps, type Paise } from "../money/money";
import type { Slab } from "../rules/types";

/** Tax on `income` (paise), layer by layer. Each layer is floored to whole paise. */
export function slabTax(income: Paise, slabs: readonly Slab[]): Paise {
  let lower = 0;
  let tax = 0;
  for (const slab of slabs) {
    const upper = slab.upTo === null ? Infinity : slab.upTo * 100;
    if (income > lower) {
      tax += applyBps(Math.min(income, upper) - lower, slab.rateBps);
    }
    lower = upper;
    if (income <= upper) break;
  }
  return tax;
}
