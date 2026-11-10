import type { Paise } from "../money/money";
import type { Reason } from "../api/types";
import type { RegimeRules } from "../rules/types";
import type { ValidatedInput } from "./validate";

function formatIndianRupees(n: number): string {
  const s = Math.floor(Math.abs(n)).toString();
  if (s.length <= 3) return (n < 0 ? "-" : "") + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const formattedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return (n < 0 ? "-" : "") + formattedRest + "," + last3;
}

export function checkProfileSupport(v: ValidatedInput): Reason[] {
  const reasons: Reason[] = [];
  if (v.jurisdiction !== "IN")
    reasons.push({
      code: "UNSUPPORTED_JURISDICTION",
      message: `Jurisdiction "${v.jurisdiction}" is not supported; only "IN" is.`,
      field: "jurisdiction",
    });
  if (v.taxpayer.category !== "individual")
    reasons.push({
      code: "UNSUPPORTED_TAXPAYER_CATEGORY",
      message: `Taxpayer category "${v.taxpayer.category}" is not supported; only "individual" is.`,
      field: "taxpayer.category",
    });
  if (v.taxpayer.residentialStatus !== "resident")
    reasons.push({
      code: "UNSUPPORTED_RESIDENTIAL_STATUS",
      message: `Residential status "${v.taxpayer.residentialStatus}" is not supported; only "resident" is.`,
      field: "taxpayer.residentialStatus",
    });
  if (v.taxpayer.ageBand !== "below-60")
    reasons.push({
      code: "UNSUPPORTED_AGE_BAND",
      message: `Age band "${v.taxpayer.ageBand}" is not supported; only "below-60" is.`,
      field: "taxpayer.ageBand",
    });
  for (const k of v.extraIncomeKeys)
    reasons.push({
      code: "UNSUPPORTED_INCOME_HEAD",
      message: `Income head "${k}" is not supported; only salary is.`,
      field: `income.${k}`,
    });
  for (const k of v.extraDeductionKeys)
    reasons.push({
      code: "UNSUPPORTED_DEDUCTION",
      message: `Deduction "${k}" is not supported; only chapterVIA (declared total, old regime) is.`,
      field: `deductions.${k}`,
    });
  return reasons;
}

/** Surcharge is not implemented, so total income above the ceiling is unsupported. */
export function checkIncomeCeiling(totalIncome: Paise, rules: RegimeRules): Reason[] {
  if (totalIncome > rules.support.maxTotalIncome * 100) {
    const formattedLimit = formatIndianRupees(rules.support.maxTotalIncome);
    return [
      {
        code: "UNSUPPORTED_SURCHARGE_RANGE",
        message: `Under the ${rules.regime} regime, total income above Rs ${formattedLimit} attracts surcharge, which this version does not support.`,
        field: "income.salary",
      },
    ];
  }
  return [];
}
