import { validateInput } from "../validation/validate";
import { calculateFromValidated } from "./calculateTax";
import type { CompareInput, CompareResult, Reason } from "./types";

export function compareRegimes(input: CompareInput): CompareResult {
  const v = validateInput(input, "compare");
  const n = calculateFromValidated(v, "new");
  const o = calculateFromValidated(v, "old");

  if (n.status === "unsupported" || o.status === "unsupported") {
    const reasons: Reason[] = [];
    const seen = new Set<string>();
    for (const r of [n, o]) {
      if (r.status !== "unsupported") continue;
      for (const x of r.reasons) {
        const key = `${x.code}|${x.field ?? ""}|${x.message}`;
        if (!seen.has(key)) {
          seen.add(key);
          reasons.push(x);
        }
      }
    }
    return { status: "unsupported", reasons };
  }

  const cheaper =
    n.taxPayable === o.taxPayable ? "equal" : n.taxPayable < o.taxPayable ? "new" : "old";
  return {
    status: "complete",
    taxPeriod: n.taxPeriod,
    new: n,
    old: o,
    cheaper,
    difference: Math.abs(n.taxPayable - o.taxPayable),
  };
}
