import { calculateTax, compareRegimes, explain } from "../dist/index.js";

// 1. Single calculation (FY 2026-27, New Regime, Salary Rs 12,85,000)
const singleResult = calculateTax({
  taxPeriod: "2026-27",
  regime: "new",
  taxpayer: {
    category: "individual",
    residentialStatus: "resident",
    ageBand: "below-60",
  },
  income: { salary: 1285000 },
});

console.log("=== Single Calculation ===");
console.log(explain(singleResult));

// 2. Regime Comparison (FY 2026-27, Salary Rs 12,85,000 with Rs 1,50,000 80C deductions)
const comparisonResult = compareRegimes({
  taxPeriod: "2026-27",
  taxpayer: {
    category: "individual",
    residentialStatus: "resident",
    ageBand: "below-60",
  },
  income: { salary: 1285000 },
  deductions: { chapterVIA: 150000 },
});

console.log("\n=== Regime Comparison ===");
console.log(explain(comparisonResult));
