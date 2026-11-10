import { describe, expect, it } from "vitest";
import {
  calculateTax,
  compareRegimes,
  TaxInputError,
  type CompareInput,
  type TaxInput,
} from "../src/index";

describe("negative input validation tests", () => {
  const getValidInput = (): TaxInput => ({
    jurisdiction: "IN",
    taxPeriod: "2026-27",
    regime: "new",
    taxpayer: {
      category: "individual",
      residentialStatus: "resident",
      ageBand: "below-60",
    },
    income: { salary: 1_285_000 },
  });

  const expectTaxInputError = (
    fn: () => unknown,
    expectedCode: string,
    expectedField?: string,
  ) => {
    try {
      fn();
      expect.unreachable("Expected fn() to throw TaxInputError");
    } catch (err) {
      expect(err).toBeInstanceOf(TaxInputError);
      const e = err as TaxInputError;
      expect(e.name).toBe("TaxInputError");
      expect(typeof e.code).toBe("string");
      expect(e.code).toBe(expectedCode);
      if (expectedField !== undefined) {
        expect(e.field).toBe(expectedField);
      }
    }
  };

  describe("calculateTax negative tests", () => {
    it("throws INVALID_INPUT for non-objects", () => {
      for (const bad of [null, undefined, [], "x", 5]) {
        expectTaxInputError(() => calculateTax(bad as any), "INVALID_INPUT");
      }
    });

    it("throws correct errors for invalid or missing taxPeriod", () => {
      // missing
      const noPeriod = getValidInput() as unknown as Record<string, unknown>;
      delete noPeriod.taxPeriod;
      expectTaxInputError(() => calculateTax(noPeriod as any), "MISSING_FIELD", "taxPeriod");

      // unknown string periods
      for (const p of ["2024-25", "2027-28", "", "constructor", "__proto__"]) {
        expectTaxInputError(
          () => calculateTax({ ...getValidInput(), taxPeriod: p as any }),
          "UNKNOWN_TAX_PERIOD",
          "taxPeriod",
        );
      }

      // number instead of string
      expectTaxInputError(
        () => calculateTax({ ...getValidInput(), taxPeriod: 2026 as any }),
        "INVALID_INPUT",
        "taxPeriod",
      );
    });

    it("throws correct errors for invalid or missing regime", () => {
      // missing
      const noRegime = getValidInput() as unknown as Record<string, unknown>;
      delete noRegime.regime;
      expectTaxInputError(() => calculateTax(noRegime as any), "MISSING_FIELD", "regime");

      // unknown regime
      for (const r of ["middle", "NEW"]) {
        expectTaxInputError(
          () => calculateTax({ ...getValidInput(), regime: r as any }),
          "UNKNOWN_REGIME",
          "regime",
        );
      }
    });

    it("throws correct errors for invalid or missing salary", () => {
      // missing
      expectTaxInputError(
        () => calculateTax({ ...getValidInput(), income: {} as any }),
        "MISSING_FIELD",
        "income.salary",
      );

      // INVALID_NUMBER
      for (const badNum of [NaN, Infinity, -Infinity, "100", null, true]) {
        expectTaxInputError(
          () => calculateTax({ ...getValidInput(), income: { salary: badNum as any } }),
          "INVALID_NUMBER",
          "income.salary",
        );
      }

      // NEGATIVE_AMOUNT
      expectTaxInputError(
        () => calculateTax({ ...getValidInput(), income: { salary: -1 } }),
        "NEGATIVE_AMOUNT",
        "income.salary",
      );

      // TOO_MANY_DECIMALS
      expectTaxInputError(
        () => calculateTax({ ...getValidInput(), income: { salary: 100.123 } }),
        "TOO_MANY_DECIMALS",
        "income.salary",
      );

      // AMOUNT_TOO_LARGE
      expectTaxInputError(
        () => calculateTax({ ...getValidInput(), income: { salary: 1e11 } }),
        "AMOUNT_TOO_LARGE",
        "income.salary",
      );
    });

    it("throws correct errors for invalid chapterVIA deduction", () => {
      expectTaxInputError(
        () =>
          calculateTax({
            ...getValidInput(),
            deductions: { chapterVIA: -1 },
          }),
        "NEGATIVE_AMOUNT",
        "deductions.chapterVIA",
      );

      expectTaxInputError(
        () =>
          calculateTax({
            ...getValidInput(),
            deductions: { chapterVIA: NaN },
          }),
        "INVALID_NUMBER",
        "deductions.chapterVIA",
      );
    });

    it("throws INVALID_INPUT for unknown top-level or taxpayer keys", () => {
      expectTaxInputError(
        () => calculateTax({ ...getValidInput(), salary: 500_000 } as any),
        "INVALID_INPUT",
        "salary",
      );

      expectTaxInputError(
        () => calculateTax({ ...getValidInput(), regimee: "new" } as any),
        "INVALID_INPUT",
        "regimee",
      );

      expectTaxInputError(
        () =>
          calculateTax({
            ...getValidInput(),
            taxpayer: { ...getValidInput().taxpayer, pan: "ABCDE1234F" } as any,
          }),
        "INVALID_INPUT",
        "taxpayer.pan",
      );
    });

    it("returns status unsupported and does NOT throw for valid-but-unsupported inputs", () => {
      const unsupportedScenarios: { input: TaxInput; expectedReason: string }[] = [
        {
          input: {
            ...getValidInput(),
            taxpayer: { ...getValidInput().taxpayer, residentialStatus: "non-resident" as any },
          },
          expectedReason: "UNSUPPORTED_RESIDENTIAL_STATUS",
        },
        {
          input: {
            ...getValidInput(),
            taxpayer: { ...getValidInput().taxpayer, ageBand: "60-to-80" as any },
          },
          expectedReason: "UNSUPPORTED_AGE_BAND",
        },
        {
          input: {
            ...getValidInput(),
            taxpayer: { ...getValidInput().taxpayer, category: "huf" as any },
          },
          expectedReason: "UNSUPPORTED_TAXPAYER_CATEGORY",
        },
        {
          input: {
            ...getValidInput(),
            jurisdiction: "US" as any,
          },
          expectedReason: "UNSUPPORTED_JURISDICTION",
        },
        {
          input: {
            ...getValidInput(),
            income: { salary: 1_285_000, interest: 10_000 } as any,
          },
          expectedReason: "UNSUPPORTED_INCOME_HEAD",
        },
        {
          input: {
            ...getValidInput(),
            income: { salary: 1_285_000, hra: 50_000 } as any,
          },
          expectedReason: "UNSUPPORTED_INCOME_HEAD",
        },
        {
          input: {
            ...getValidInput(),
            deductions: { hra: 25_000 } as any,
          },
          expectedReason: "UNSUPPORTED_DEDUCTION",
        },
      ];

      for (const { input, expectedReason } of unsupportedScenarios) {
        const result = calculateTax(input);
        expect(result.status).toBe("unsupported");
        if (result.status === "unsupported") {
          expect(result.reasons.some((r) => r.code === expectedReason)).toBe(true);
        }
      }
    });
  });

  describe("compareRegimes negative tests (same throw/return split)", () => {
    const getValidCompareInput = (): CompareInput => ({
      jurisdiction: "IN",
      taxPeriod: "2026-27",
      taxpayer: {
        category: "individual",
        residentialStatus: "resident",
        ageBand: "below-60",
      },
      income: { salary: 1_285_000 },
    });

    it("throws TaxInputError for invalid input structure", () => {
      expectTaxInputError(() => compareRegimes(null as any), "INVALID_INPUT");
      expectTaxInputError(
        () => compareRegimes({ ...getValidCompareInput(), income: { salary: "bad" as any } }),
        "INVALID_NUMBER",
        "income.salary",
      );
      expectTaxInputError(
        () => compareRegimes({ ...getValidCompareInput(), taxPeriod: "2024-25" as any }),
        "UNKNOWN_TAX_PERIOD",
        "taxPeriod",
      );
    });

    it("returns status unsupported for valid-but-unsupported profile in compareRegimes", () => {
      const result = compareRegimes({
        ...getValidCompareInput(),
        taxpayer: { ...getValidCompareInput().taxpayer, residentialStatus: "non-resident" as any },
      });
      expect(result.status).toBe("unsupported");
      if (result.status === "unsupported") {
        expect(result.reasons.some((r) => r.code === "UNSUPPORTED_RESIDENTIAL_STATUS")).toBe(true);
      }
    });
  });
});
