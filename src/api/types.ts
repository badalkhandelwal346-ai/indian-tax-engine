export type { Step, StepCode } from "../core/calculate";
import type { Step } from "../core/calculate";

export type Regime = "new" | "old";
export type TaxPeriod = "2025-26" | "2026-27";

export interface TaxInput {
  jurisdiction?: "IN";
  taxPeriod: TaxPeriod;
  regime: Regime;
  taxpayer: { category: "individual"; residentialStatus: "resident"; ageBand: "below-60" };
  income: { salary: number }; // INR, gross annual, max 2 decimals
  deductions?: { chapterVIA?: number }; // declared total, old regime only
}
export type CompareInput = Omit<TaxInput, "regime">;

export interface Reason {
  code: string;
  message: string;
  field?: string;
}
export interface Warning {
  code: string;
  message: string;
}

export interface CompleteResult {
  status: "complete";
  amountUnit: "INR";
  taxPeriod: string;
  regime: Regime;
  rulesetVersion: string;
  totalIncome: number;
  taxPayable: number;
  steps: Step[];
  appliedRules: { ruleId: string; ruleVersion: string }[];
  assumptions: string[];
  warnings: Warning[];
}
export interface UnsupportedResult {
  status: "unsupported";
  reasons: Reason[];
}
export type TaxResult = CompleteResult | UnsupportedResult;

export interface RegimeComparison {
  status: "complete";
  taxPeriod: string;
  new: CompleteResult;
  old: CompleteResult;
  cheaper: Regime | "equal";
  difference: number; // INR, absolute
}
export type CompareResult = RegimeComparison | UnsupportedResult;
