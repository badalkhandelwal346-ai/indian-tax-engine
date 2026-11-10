import { TaxInputError } from "../errors";
import type { PeriodRules, RegimeRules } from "./types";
import p2526 from "./india/2025-26.json";
import p2627 from "./india/2026-27.json";

const REGISTRY = new Map<string, PeriodRules>([
  ["2025-26", p2526 as unknown as PeriodRules],
  ["2026-27", p2627 as unknown as PeriodRules],
]);

export const SUPPORTED_PERIODS: readonly string[] = Object.freeze([...REGISTRY.keys()]);

export function getRules(taxPeriod: string, regime: string): RegimeRules {
  const period = REGISTRY.get(taxPeriod);
  if (!period) throw new TaxInputError("UNKNOWN_TAX_PERIOD", `Unknown tax period: ${String(taxPeriod)}`, "taxPeriod");
  if (regime !== "new" && regime !== "old")
    throw new TaxInputError("UNKNOWN_REGIME", `Unknown regime: ${String(regime)}`, "regime");
  return period[regime];
}

