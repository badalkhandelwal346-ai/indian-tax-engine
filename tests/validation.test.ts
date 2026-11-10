import { describe, expect, it } from "vitest";
import { TaxInputError } from "../src/errors";
import { validateInput } from "../src/validation/validate";

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (typeof val === "object" && val !== null) {
      deepFreeze(val);
    }
  }
  return obj;
}

describe("validateInput", () => {
  const getValidInput = () => ({
    jurisdiction: "IN" as const,
    taxPeriod: "2026-27" as const,
    regime: "new" as const,
    taxpayer: {
      category: "individual" as const,
      residentialStatus: "resident" as const,
      ageBand: "below-60" as const,
    },
    income: {
      salary: 1_285_000,
    },
  });

  it("validates base valid input in calculate mode", () => {
    const input = getValidInput();
    const result = validateInput(input, "calculate");
    expect(result.salary).toBe(128_500_000);
    expect(result.chapterVIA).toBe(0);
    expect(result.extraIncomeKeys).toEqual([]);
    expect(result.extraDeductionKeys).toEqual([]);
    expect(result.jurisdiction).toBe("IN");
    expect(result.taxPeriod).toBe("2026-27");
    expect(result.regime).toBe("new");
    expect(result.taxpayer).toEqual({
      category: "individual",
      residentialStatus: "resident",
      ageBand: "below-60",
    });
  });

  it("defaults jurisdiction to IN when omitted", () => {
    const input = getValidInput() as Record<string, unknown>;
    delete input.jurisdiction;
    const result = validateInput(input, "calculate");
    expect(result.jurisdiction).toBe("IN");
  });

  it("captures extra income keys without throwing", () => {
    const input = {
      ...getValidInput(),
      income: {
        salary: 1_285_000,
        interest: 5000,
      },
    };
    const result = validateInput(input, "calculate");
    expect(result.extraIncomeKeys).toEqual(["interest"]);
  });

  it("captures extra deduction keys without throwing", () => {
    const input = {
      ...getValidInput(),
      deductions: {
        hra: 1,
      },
    };
    const result = validateInput(input, "calculate");
    expect(result.extraDeductionKeys).toEqual(["hra"]);
    expect(result.chapterVIA).toBe(0);
  });

  it("converts declared chapterVIA deduction to paise", () => {
    const input = {
      ...getValidInput(),
      deductions: {
        chapterVIA: 150_000,
      },
    };
    const result = validateInput(input, "calculate");
    expect(result.chapterVIA).toBe(15_000_000);
    expect(result.extraDeductionKeys).toEqual([]);
  });

  describe("error handling and input rejection", () => {
    it("throws INVALID_INPUT for non-plain-object inputs", () => {
      for (const bad of [null, [], "x", 123, undefined]) {
        try {
          validateInput(bad, "calculate");
          expect.unreachable();
        } catch (err) {
          expect(err).toBeInstanceOf(TaxInputError);
          expect((err as TaxInputError).code).toBe("INVALID_INPUT");
        }
      }
    });

    it("throws MISSING_FIELD when required fields are missing", () => {
      const missingCases: [string, Record<string, unknown>][] = [
        ["taxPeriod", (() => { const i = getValidInput() as Record<string, unknown>; delete i.taxPeriod; return i; })()],
        ["regime", (() => { const i = getValidInput() as Record<string, unknown>; delete i.regime; return i; })()],
        ["taxpayer", (() => { const i = getValidInput() as Record<string, unknown>; delete i.taxpayer; return i; })()],
        ["income", (() => { const i = getValidInput() as Record<string, unknown>; delete i.income; return i; })()],
        ["income.salary", (() => { const i = getValidInput(); return { ...i, income: {} }; })()],
        ["taxpayer.ageBand", (() => {
          const i = getValidInput();
          return {
            ...i,
            taxpayer: { category: "individual", residentialStatus: "resident" } as unknown as typeof i.taxpayer,
          };
        })()],
      ];

      for (const [field, badInput] of missingCases) {
        try {
          validateInput(badInput, "calculate");
          expect.unreachable(`Expected MISSING_FIELD for ${field}`);
        } catch (err) {
          expect(err).toBeInstanceOf(TaxInputError);
          expect((err as TaxInputError).code).toBe("MISSING_FIELD");
          expect((err as TaxInputError).field).toBe(field);
        }
      }
    });

    it("throws UNKNOWN_TAX_PERIOD for unsupported or prototype keys", () => {
      for (const badPeriod of ["2024-25", "constructor"]) {
        try {
          validateInput({ ...getValidInput(), taxPeriod: badPeriod as any }, "calculate");
          expect.unreachable();
        } catch (err) {
          expect(err).toBeInstanceOf(TaxInputError);
          expect((err as TaxInputError).code).toBe("UNKNOWN_TAX_PERIOD");
        }
      }
    });

    it("throws UNKNOWN_REGIME for invalid regime", () => {
      try {
        validateInput({ ...getValidInput(), regime: "middle" as any }, "calculate");
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TaxInputError);
        expect((err as TaxInputError).code).toBe("UNKNOWN_REGIME");
      }
    });

    it("throws INVALID_NUMBER, NEGATIVE_AMOUNT, TOO_MANY_DECIMALS, and AMOUNT_TOO_LARGE for bad salary", () => {
      // NaN or string
      for (const badNum of [NaN, "100" as any]) {
        try {
          validateInput({ ...getValidInput(), income: { salary: badNum } }, "calculate");
          expect.unreachable();
        } catch (err) {
          expect(err).toBeInstanceOf(TaxInputError);
          expect((err as TaxInputError).code).toBe("INVALID_NUMBER");
        }
      }

      // -5
      try {
        validateInput({ ...getValidInput(), income: { salary: -5 } }, "calculate");
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TaxInputError);
        expect((err as TaxInputError).code).toBe("NEGATIVE_AMOUNT");
      }

      // 1.234
      try {
        validateInput({ ...getValidInput(), income: { salary: 1.234 } }, "calculate");
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TaxInputError);
        expect((err as TaxInputError).code).toBe("TOO_MANY_DECIMALS");
      }

      // 1e11 (exceeds MAX_INPUT_RUPEES = 1e10)
      try {
        validateInput({ ...getValidInput(), income: { salary: 1e11 } }, "calculate");
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TaxInputError);
        expect((err as TaxInputError).code).toBe("AMOUNT_TOO_LARGE");
      }
    });

    it("throws INVALID_INPUT for unknown top-level key", () => {
      try {
        validateInput({ ...getValidInput(), salary: 1000 } as any, "calculate");
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TaxInputError);
        expect((err as TaxInputError).code).toBe("INVALID_INPUT");
      }
    });

    it("throws INVALID_INPUT for unknown key inside taxpayer", () => {
      try {
        validateInput(
          {
            ...getValidInput(),
            taxpayer: { ...getValidInput().taxpayer, unknownKey: "val" } as any,
          },
          "calculate",
        );
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TaxInputError);
        expect((err as TaxInputError).code).toBe("INVALID_INPUT");
      }
    });

    it("throws INVALID_INPUT when taxpayer.category is not a string", () => {
      try {
        validateInput(
          {
            ...getValidInput(),
            taxpayer: { ...getValidInput().taxpayer, category: 123 as any },
          },
          "calculate",
        );
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TaxInputError);
        expect((err as TaxInputError).code).toBe("INVALID_INPUT");
      }
    });

    it("throws INVALID_INPUT when deductions is a string", () => {
      try {
        validateInput({ ...getValidInput(), deductions: "string" as any }, "calculate");
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TaxInputError);
        expect((err as TaxInputError).code).toBe("INVALID_INPUT");
      }
    });
  });

  describe("compare mode", () => {
    it("does not require regime and leaves regime undefined in output", () => {
      const input = getValidInput() as Record<string, unknown>;
      delete input.regime;
      const result = validateInput(input, "compare");
      expect(result.regime).toBeUndefined();
    });

    it("accepts a supplied regime in compare mode and leaves regime undefined", () => {
      const input = getValidInput();
      const result = validateInput(input, "compare");
      expect(result.regime).toBeUndefined();
    });
  });

  describe("immutability", () => {
    it("does not mutate the input object", () => {
      const input = deepFreeze(getValidInput());
      expect(() => validateInput(input, "calculate")).not.toThrow();
    });
  });
});

