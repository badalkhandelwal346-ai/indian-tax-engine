import { describe, expect, it } from "vitest";
import {
  compareRegimes,
  type CompareInput,
  type RegimeComparison,
  type UnsupportedResult,
} from "../src/index";

describe("compareRegimes", () => {
  it("compares regimes for salary 12,85,000 with no deductions (2026-27)", () => {
    const input: CompareInput = {
      taxPeriod: "2026-27",
      taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
      income: { salary: 1_285_000 },
    };

    const res = compareRegimes(input);
    expect(res.status).toBe("complete");
    const comp = res as RegimeComparison;
    expect(comp.new.taxPayable).toBe(10_400);
    expect(comp.old.totalIncome).toBe(1_235_000);
    expect(comp.old.taxPayable).toBe(190_320);
    expect(comp.cheaper).toBe("new");
    expect(comp.difference).toBe(179_920);
  });

  it("compares regimes for salary 12,85,000 with chapterVIA 1,50,000 (2026-27)", () => {
    const input: CompareInput = {
      taxPeriod: "2026-27",
      taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
      income: { salary: 1_285_000 },
      deductions: { chapterVIA: 150_000 },
    };

    const res = compareRegimes(input);
    expect(res.status).toBe("complete");
    const comp = res as RegimeComparison;
    expect(comp.old.totalIncome).toBe(1_085_000);
    expect(comp.old.taxPayable).toBe(143_520);
    expect(comp.new.taxPayable).toBe(10_400);
    expect(comp.new.warnings.some((w) => w.code === "CHAPTER_VIA_NOT_APPLICABLE")).toBe(true);
    expect(comp.cheaper).toBe("new");
    expect(comp.difference).toBe(133_120);
  });

  it("returns cheaper equal and difference 0 when both regimes have zero tax (salary 3,00,000)", () => {
    const input: CompareInput = {
      taxPeriod: "2026-27",
      taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
      income: { salary: 300_000 },
    };

    const res = compareRegimes(input);
    expect(res.status).toBe("complete");
    const comp = res as RegimeComparison;
    expect(comp.new.taxPayable).toBe(0);
    expect(comp.old.taxPayable).toBe(0);
    expect(comp.cheaper).toBe("equal");
    expect(comp.difference).toBe(0);
  });

  it("returns status unsupported for salary 60,00,000 exceeding ceiling", () => {
    const input: CompareInput = {
      taxPeriod: "2026-27",
      taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" },
      income: { salary: 6_000_000 },
    };

    const res = compareRegimes(input);
    expect(res.status).toBe("unsupported");
    const unsupp = res as UnsupportedResult;
    expect(unsupp.reasons.length).toBe(2); // one for new regime, one for old regime
    expect(unsupp.reasons.every((r) => r.code === "UNSUPPORTED_SURCHARGE_RANGE")).toBe(true);
  });

  it("returns status unsupported with deduplicated reasons for unsupported profile", () => {
    const input: CompareInput = {
      taxPeriod: "2026-27",
      taxpayer: { category: "individual", residentialStatus: "non-resident" as any, ageBand: "below-60" },
      income: { salary: 1_000_000 },
    };

    const res = compareRegimes(input);
    expect(res.status).toBe("unsupported");
    const unsupp = res as UnsupportedResult;
    // Both new and old hit UNSUPPORTED_RESIDENTIAL_STATUS, but seen deduplication leaves 1
    expect(unsupp.reasons).toEqual([
      {
        code: "UNSUPPORTED_RESIDENTIAL_STATUS",
        message: 'Residential status "non-resident" is not supported; only "resident" is.',
        field: "taxpayer.residentialStatus",
      },
    ]);
  });

  it("accepts and ignores an extraneous regime field supplied to compareRegimes", () => {
    const input = {
      taxPeriod: "2026-27" as const,
      regime: "new" as const,
      taxpayer: { category: "individual" as const, residentialStatus: "resident" as const, ageBand: "below-60" as const },
      income: { salary: 500_000 },
    };

    const res = compareRegimes(input as any);
    expect(res.status).toBe("complete");
    const comp = res as RegimeComparison;
    expect(comp.new).toBeDefined();
    expect(comp.old).toBeDefined();
  });
});

