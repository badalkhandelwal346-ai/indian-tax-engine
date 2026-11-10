import { TaxInputError } from "../errors";
import { rupeesToPaise, type Paise } from "../money/money";
import { SUPPORTED_PERIODS } from "../rules/registry";
import type { Regime, TaxPeriod } from "../api/types";

export type ValidationMode = "calculate" | "compare";

export interface ValidatedInput {
  jurisdiction: string;
  taxPeriod: TaxPeriod;
  regime: Regime | undefined; // undefined in "compare" mode
  taxpayer: { category: string; residentialStatus: string; ageBand: string };
  salary: Paise;
  chapterVIA: Paise;
  extraIncomeKeys: string[]; // income heads other than salary (unsupported, reported later)
  extraDeductionKeys: string[]; // deduction keys other than chapterVIA (unsupported, reported later)
}

const TOP_LEVEL_KEYS = ["jurisdiction", "taxPeriod", "regime", "taxpayer", "income", "deductions"];
const TAXPAYER_KEYS = ["category", "residentialStatus", "ageBand"];

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function requireString(obj: Record<string, unknown>, key: string, field: string): string {
  const v = obj[key];
  if (v === undefined) throw new TaxInputError("MISSING_FIELD", `${field} is required`, field);
  if (typeof v !== "string") throw new TaxInputError("INVALID_INPUT", `${field} must be a string`, field);
  return v;
}

function rejectUnknownKeys(obj: Record<string, unknown>, allowed: string[], prefix: string): void {
  for (const k of Object.keys(obj))
    if (!allowed.includes(k))
      throw new TaxInputError("INVALID_INPUT", `Unknown field: ${prefix}${k}`, `${prefix}${k}`);
}

function requireObject(v: unknown, field: string): Record<string, unknown> {
  if (v === undefined) throw new TaxInputError("MISSING_FIELD", `${field} is required`, field);
  if (!isPlainObject(v)) throw new TaxInputError("INVALID_INPUT", `${field} must be an object`, field);
  return v;
}

export function validateInput(raw: unknown, mode: ValidationMode): ValidatedInput {
  if (!isPlainObject(raw)) throw new TaxInputError("INVALID_INPUT", "Input must be an object");
  rejectUnknownKeys(raw, TOP_LEVEL_KEYS, "");

  const taxPeriod = requireString(raw, "taxPeriod", "taxPeriod");
  if (!SUPPORTED_PERIODS.includes(taxPeriod))
    throw new TaxInputError("UNKNOWN_TAX_PERIOD", `Unknown tax period: ${taxPeriod}`, "taxPeriod");

  let regime: Regime | undefined;
  if (mode === "calculate") {
    const r = requireString(raw, "regime", "regime");
    if (r !== "new" && r !== "old")
      throw new TaxInputError("UNKNOWN_REGIME", `Unknown regime: ${r}`, "regime");
    regime = r;
  } // in "compare" mode a supplied regime is ignored; both regimes are always computed

  const jurisdiction = raw.jurisdiction === undefined ? "IN" : requireString(raw, "jurisdiction", "jurisdiction");

  const tp = requireObject(raw.taxpayer, "taxpayer");
  rejectUnknownKeys(tp, TAXPAYER_KEYS, "taxpayer.");
  const taxpayer = {
    category: requireString(tp, "category", "taxpayer.category"),
    residentialStatus: requireString(tp, "residentialStatus", "taxpayer.residentialStatus"),
    ageBand: requireString(tp, "ageBand", "taxpayer.ageBand"),
  };

  const income = requireObject(raw.income, "income");
  if (income.salary === undefined) throw new TaxInputError("MISSING_FIELD", "income.salary is required", "income.salary");
  const salary = rupeesToPaise(income.salary as number, "income.salary");
  const extraIncomeKeys = Object.keys(income).filter((k) => k !== "salary").sort();

  const deductions = raw.deductions === undefined ? {} : requireObject(raw.deductions, "deductions");
  const chapterVIA =
    deductions.chapterVIA === undefined ? 0 : rupeesToPaise(deductions.chapterVIA as number, "deductions.chapterVIA");
  const extraDeductionKeys = Object.keys(deductions).filter((k) => k !== "chapterVIA").sort();

  return {
    jurisdiction,
    taxPeriod: taxPeriod as TaxPeriod,
    regime,
    taxpayer,
    salary,
    chapterVIA,
    extraIncomeKeys,
    extraDeductionKeys,
  };
}

