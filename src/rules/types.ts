export interface Slab {
  upTo: number | null;
  rateBps: number;
}

export type Verification = "secondary-corroborated" | "primary-verified" | "open-conflict";

export interface RuleSource {
  ruleId: string;
  provision: string;
  url: string;
  retrievedOn: string;
  verification: Verification;
}

export interface RegimeRules {
  rulesetVersion: string;
  jurisdiction: "IN";
  taxPeriod: string;
  framework: "IT_ACT_1961" | "IT_ACT_2025";
  regime: "new" | "old";
  effective: { from: string; to: string };
  status: "draft" | "verified" | "retired";
  slabs: Slab[];
  standardDeduction: number;
  rebate: { incomeLimit: number; max: number; marginalRelief: boolean };
  cessBps: number;
  rounding: { totalIncome: number; payable: number };
  support: { maxTotalIncome: number };
  sources: RuleSource[];
}

export interface PeriodRules {
  new: RegimeRules;
  old: RegimeRules;
}

