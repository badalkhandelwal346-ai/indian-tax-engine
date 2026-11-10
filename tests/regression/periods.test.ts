import { describe, expect, it } from "vitest";
import { calculateTax, type CompleteResult, type Regime, type TaxInput } from "../../src/index";

describe("cross-period parity regression tests", () => {
  // Deterministic LCG pseudo-random generator
  let s = 54321;
  const rand = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;

  // Generate 100 salaries in [0, 50,00,000]
  const salaries: number[] = [];
  for (let i = 0; i < 100; i++) {
    const whole = Math.floor(rand() * 5_000_001);
    const hasPaise = rand() < 0.5;
    const paise = hasPaise ? Math.floor(rand() * 100) : 0;
    salaries.push(Number((whole + paise / 100).toFixed(2)));
  }

  const regimes: Regime[] = ["new", "old"];

  for (const regime of regimes) {
    it(`produces identical calculation values across 2025-26 and 2026-27 for ${regime} regime`, () => {
      for (const salary of salaries) {
        const input25: TaxInput = {
          jurisdiction: "IN",
          taxPeriod: "2025-26",
          regime,
          taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
          income: { salary },
        };

        const input26: TaxInput = {
          jurisdiction: "IN",
          taxPeriod: "2026-27",
          regime,
          taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
          income: { salary },
        };

        const res25 = calculateTax(input25);
        const res26 = calculateTax(input26);

        expect(res25.status).toBe("complete");
        expect(res26.status).toBe("complete");

        const c25 = res25 as CompleteResult;
        const c26 = res26 as CompleteResult;

        // Identical numerical outputs
        expect(c25.totalIncome).toBe(c26.totalIncome);
        expect(c25.taxPayable).toBe(c26.taxPayable);

        // Metadata differs
        expect(c25.taxPeriod).toBe("2025-26");
        expect(c26.taxPeriod).toBe("2026-27");
        expect(c25.rulesetVersion).toBe(`IN-2025-26-${regime}-r1`);
        expect(c26.rulesetVersion).toBe(`IN-2026-27-${regime}-r1`);
        expect(c25.rulesetVersion).not.toBe(c26.rulesetVersion);
      }
    });
  }
});

