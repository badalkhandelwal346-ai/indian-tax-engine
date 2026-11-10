import type { StepCode } from "../core/calculate";
import type { CompareResult, CompleteResult, TaxResult, UnsupportedResult } from "./types";

export function formatINR(rupees: number): string {
  const negative = rupees < 0;
  const [whole, frac] = Math.abs(rupees).toFixed(2).split(".");
  const head = whole.slice(0, -3);
  const tail = whole.slice(-3);
  const grouped = head ? head.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + tail : tail;
  return `${negative ? "-" : ""}\u20B9${grouped}${frac === "00" ? "" : "." + frac}`;
}

const LABELS: Record<StepCode, string> = {
  GROSS_SALARY: "Gross salary",
  STANDARD_DEDUCTION: "Standard deduction",
  CHAPTER_VIA_DEDUCTION: "Chapter VI-A deductions (as declared)",
  TOTAL_INCOME_ROUNDED: "Total income (rounded to nearest \u20B910)",
  SLAB_TAX: "Tax on slabs",
  REBATE: "Rebate",
  MARGINAL_RELIEF: "Marginal relief",
  CESS: "Health and education cess",
  TAX_PAYABLE_ROUNDED: "Tax payable (rounded to nearest \u20B910)",
};

export function explain(result: TaxResult | CompareResult): string {
  if (result.status === "unsupported") return renderUnsupported(result);
  if ("cheaper" in result) {
    const verdict =
      result.cheaper === "equal"
        ? "Both regimes give the same tax."
        : `The ${result.cheaper} regime is cheaper by ${formatINR(result.difference)}.`;
    return [renderComplete(result.new), "", renderComplete(result.old), "", verdict].join("\n");
  }
  return renderComplete(result);
}

function renderUnsupported(r: UnsupportedResult): string {
  return ["Not supported:", ...r.reasons.map((x) => ` - [${x.code}] ${x.message}`)].join("\n");
}

function renderComplete(r: CompleteResult): string {
  const lines = [
    `Tax estimate for ${r.taxPeriod}, ${r.regime} regime (ruleset ${r.rulesetVersion})`,
  ];
  for (const s of r.steps)
    lines.push(
      `${String(s.order).padStart(2)}. ${LABELS[s.code].padEnd(46, ".")} ${formatINR(s.amount)}`,
    );
  lines.push(`Total tax payable: ${formatINR(r.taxPayable)}`);
  if (r.assumptions.length) lines.push("Assumptions:", ...r.assumptions.map((a) => ` - ${a}`));
  if (r.warnings.length) lines.push("Warnings:", ...r.warnings.map((w) => ` - [${w.code}] ${w.message}`));
  return lines.join("\n");
}

