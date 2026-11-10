import { computeTotalIncome, runCore } from "../core/calculate";
import { paiseToRupees } from "../money/money";
import { getRules } from "../rules/registry";
import { checkIncomeCeiling, checkProfileSupport } from "../validation/support";
import { validateInput, type ValidatedInput } from "../validation/validate";
import type { CompleteResult, Regime, TaxInput, TaxResult, Warning } from "./types";

export function calculateTax(input: TaxInput): TaxResult {
  const v = validateInput(input, "calculate");
  return calculateFromValidated(v, v.regime as Regime);
}

/** Shared with compareRegimes. Not exported from the package index. */
export function calculateFromValidated(v: ValidatedInput, regime: Regime): TaxResult {
  const profileReasons = checkProfileSupport(v);
  if (profileReasons.length > 0) return { status: "unsupported", reasons: profileReasons };

  const rules = getRules(v.taxPeriod, regime);
  const args = { salary: v.salary, chapterVIA: v.chapterVIA, rules };

  const parts = computeTotalIncome(args);
  const ceilingReasons = checkIncomeCeiling(parts.totalIncome, rules);
  if (ceilingReasons.length > 0) return { status: "unsupported", reasons: ceilingReasons };

  const out = runCore(args);

  const assumptions: string[] = [
    "Resident individual below 60 with salary income only.",
    "Income is gross annual salary; the ruleset's standard deduction is applied automatically.",
    "Informational estimate only; not tax advice and not suitable for filing.",
  ];
  const warnings: Warning[] = [];

  if (rules.status !== "verified")
    warnings.push({
      code: "RULES_NOT_VERIFIED",
      message: `Ruleset ${rules.rulesetVersion} has status "${rules.status}"; figures are not confirmed against primary sources.`,
    });
  for (const s of rules.sources)
    if (s.verification === "open-conflict")
      warnings.push({
        code: "RULE_OPEN_CONFLICT",
        message: `Rule ${s.ruleId} has an unresolved source conflict (${s.provision}).`,
      });

  if (regime === "new" && v.chapterVIA > 0)
    warnings.push({
      code: "CHAPTER_VIA_NOT_APPLICABLE",
      message: "Chapter VI-A deductions are not applied under the new regime.",
    });
  if (regime === "old" && v.chapterVIA > 0) {
    assumptions.push("Chapter VI-A deductions were taken as a declared total.");
    warnings.push({
      code: "CHAPTER_VIA_ASSUMED_VALID",
      message:
        "The declared Chapter VI-A total was applied as given; section caps and eligibility are not validated.",
    });
    if (parts.chapterVIAApplied < v.chapterVIA)
      warnings.push({
        code: "CHAPTER_VIA_CAPPED",
        message:
          "The declared Chapter VI-A total exceeded income after the standard deduction and was capped.",
      });
  }

  const result: CompleteResult = {
    status: "complete",
    amountUnit: "INR",
    taxPeriod: rules.taxPeriod,
    regime,
    rulesetVersion: rules.rulesetVersion,
    totalIncome: paiseToRupees(out.totalIncome),
    taxPayable: paiseToRupees(out.taxPayable),
    steps: out.steps,
    appliedRules: rules.sources.map((s) => ({ ruleId: s.ruleId, ruleVersion: rules.rulesetVersion })),
    assumptions,
    warnings,
  };
  return result;
}
