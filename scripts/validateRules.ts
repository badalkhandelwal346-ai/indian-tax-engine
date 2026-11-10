import type { PeriodRules } from "../src/rules/types";

export interface RuleIssue {
  file: string;
  path: string;
  message: string;
}

const EXPECTED_FRAMEWORK: Record<string, string> = {
  "2025-26": "IT_ACT_1961",
  "2026-27": "IT_ACT_2025",
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const VERIFICATIONS = ["secondary-corroborated", "primary-verified", "open-conflict"];
const STATUSES = ["draft", "verified", "retired"];

export function validatePeriod(file: string, taxPeriod: string, data: PeriodRules): RuleIssue[] {
  const issues: RuleIssue[] = [];
  for (const regime of ["new", "old"] as const) {
    const bad = (path: string, message: string) =>
      issues.push({ file, path: `${regime}.${path}`, message });
    const r = data[regime];
    if (!r) {
      issues.push({ file, path: regime, message: "missing regime" });
      continue;
    }

    if (r.regime !== regime) bad("regime", `must equal "${regime}"`);
    if (r.taxPeriod !== taxPeriod) bad("taxPeriod", `must equal "${taxPeriod}" (the file name)`);
    if (r.jurisdiction !== "IN") bad("jurisdiction", 'must be "IN"');
    const fw = EXPECTED_FRAMEWORK[taxPeriod];
    if (fw && r.framework !== fw) bad("framework", `must be ${fw} for ${taxPeriod}`);
    if (!new RegExp(`^IN-${taxPeriod}-${regime}-r\\d+$`).test(r.rulesetVersion))
      bad("rulesetVersion", `must match IN-${taxPeriod}-${regime}-r<number>`);
    if (!STATUSES.includes(r.status)) bad("status", `must be one of ${STATUSES.join(", ")}`);

    if (!r.effective || !DATE.test(r.effective.from) || !DATE.test(r.effective.to))
      bad("effective", "from/to must be YYYY-MM-DD");
    else if (r.effective.from >= r.effective.to) bad("effective", "from must be before to");

    if (!Array.isArray(r.slabs) || r.slabs.length === 0)
      bad("slabs", "must be a non-empty array");
    else {
      let prev = 0;
      r.slabs.forEach((s, i) => {
        const last = i === r.slabs.length - 1;
        if (last) {
          if (s.upTo !== null) bad(`slabs[${i}].upTo`, "last slab must have upTo null");
        } else if (!Number.isInteger(s.upTo) || (s.upTo as number) <= prev)
          bad(`slabs[${i}].upTo`, "must be an integer greater than the previous slab");
        else prev = s.upTo as number;
        if (!Number.isInteger(s.rateBps) || s.rateBps < 0 || s.rateBps > 10000)
          bad(`slabs[${i}].rateBps`, "must be an integer 0..10000");
      });
    }

    const nonNegInt = (path: string, v: unknown) => {
      if (!Number.isInteger(v) || (v as number) < 0)
        bad(path, "must be a non-negative integer");
    };
    nonNegInt("standardDeduction", r.standardDeduction);
    nonNegInt("rebate.incomeLimit", r.rebate?.incomeLimit);
    nonNegInt("rebate.max", r.rebate?.max);
    if (typeof r.rebate?.marginalRelief !== "boolean")
      bad("rebate.marginalRelief", "must be boolean");
    nonNegInt("cessBps", r.cessBps);
    if ((r.cessBps as number) > 10000) bad("cessBps", "must be at most 10000");
    nonNegInt("rounding.totalIncome", r.rounding?.totalIncome);
    nonNegInt("rounding.payable", r.rounding?.payable);
    nonNegInt("support.maxTotalIncome", r.support?.maxTotalIncome);

    if (!Array.isArray(r.sources) || r.sources.length === 0)
      bad("sources", "at least one source is required");
    else {
      const ids = new Set<string>();
      r.sources.forEach((s, i) => {
        if (!s.ruleId) bad(`sources[${i}].ruleId`, "required");
        else if (ids.has(s.ruleId)) bad(`sources[${i}].ruleId`, `duplicate ruleId ${s.ruleId}`);
        else ids.add(s.ruleId);
        if (!s.provision) bad(`sources[${i}].provision`, "required");
        if (!/^https:\/\//.test(s.url ?? "")) bad(`sources[${i}].url`, "must start with https://");
        if (!DATE.test(s.retrievedOn ?? "")) bad(`sources[${i}].retrievedOn`, "must be YYYY-MM-DD");
        if (!VERIFICATIONS.includes(s.verification))
          bad(`sources[${i}].verification`, `must be one of ${VERIFICATIONS.join(", ")}`);
      });
      if (r.status === "verified") {
        if (r.sources.some((s) => s.verification !== "primary-verified"))
          bad("status", '"verified" requires every source to be "primary-verified"');
        if (r.sources.some((s) => /TO CONFIRM/i.test(s.provision)))
          bad("status", '"verified" is not allowed while a provision still says TO CONFIRM');
      }
    }
  }
  return issues;
}
