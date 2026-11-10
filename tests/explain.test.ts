import { describe, expect, it } from "vitest";
import {
  calculateTax,
  compareRegimes,
  explain,
  formatINR,
  type CompareInput,
  type TaxInput,
} from "../src/index";

describe("formatINR", () => {
  it("formats numbers with Indian grouping and optional decimals correctly", () => {
    expect(formatINR(1_210_000)).toBe("\u20B912,10,000");
    expect(formatINR(61_500)).toBe("\u20B961,500");
    expect(formatINR(0)).toBe("\u20B90");
    expect(formatINR(999)).toBe("\u20B9999");
    expect(formatINR(100_000)).toBe("\u20B91,00,000");
    expect(formatINR(12_500_000)).toBe("\u20B91,25,00,000");
    expect(formatINR(10.5)).toBe("\u20B910.50");
    expect(formatINR(-2500)).toBe("-\u20B92,500");
  });
});

describe("explain", () => {
  it("renders explain text for calculateTax result (salary 12,85,000, new regime 2026-27)", () => {
    const input: TaxInput = {
      taxPeriod: "2026-27",
      regime: "new",
      taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
      income: { salary: 1_285_000 },
    };

    const result = calculateTax(input);
    const text = explain(result);

    expect(text).toContain("Marginal relief");
    expect(text).toContain("\u20B951,500");
    expect(text).toContain("\u20B910,400");
    expect(text).toContain("IN-2026-27-new-r1");
  });

  it("renders explain text for unsupported result starting with 'Not supported:'", () => {
    const input: TaxInput = {
      taxPeriod: "2026-27",
      regime: "new",
      taxpayer: { category: "individual", residentialStatus: "non-resident" as any, ageBand: "below-60" },
      income: { salary: 1_000_000 },
    };

    const result = calculateTax(input);
    const text = explain(result);
    expect(text.startsWith("Not supported:")).toBe(true);
    expect(text).toContain("[UNSUPPORTED_RESIDENTIAL_STATUS]");
  });

  it("renders explain text for regime comparison with verdict line", () => {
    const input: CompareInput = {
      taxPeriod: "2026-27",
      taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
      income: { salary: 1_285_000 },
    };

    const comp = compareRegimes(input);
    const text = explain(comp);

    expect(text).toContain("The new regime is cheaper by \u20B91,79,920.");
    expect(text).toContain("Tax estimate for 2026-27, new regime");
    expect(text).toContain("Tax estimate for 2026-27, old regime");
  });

  it("produces deterministic output for the same input", () => {
    const input: TaxInput = {
      taxPeriod: "2026-27",
      regime: "new",
      taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
      income: { salary: 1_285_000 },
    };

    const text1 = explain(calculateTax(input));
    const text2 = explain(calculateTax(input));
    expect(text1).toBe(text2);
  });
});
