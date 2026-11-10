import { describe, expect, it } from "vitest";
import { TaxInputError } from "../src/errors";
import {
  MAX_INPUT_RUPEES,
  applyBps,
  paiseToRupees,
  roundToNearestTen,
  rupeesToPaise,
} from "../src/money/money";

describe("rupeesToPaise", () => {
  it("converts valid rupees to integer paise correctly", () => {
    expect(rupeesToPaise(1_200_000)).toBe(120_000_000);
    expect(rupeesToPaise(10.25)).toBe(1025);
    expect(rupeesToPaise(0)).toBe(0);
    expect(Object.is(rupeesToPaise(-0), 0)).toBe(true);
    expect(rupeesToPaise(-0)).toBe(0);
    expect(rupeesToPaise(0.1)).toBe(10);
    expect(rupeesToPaise(9_999_999_999.99)).toBe(999_999_999_999);
  });

  it("throws TaxInputError with INVALID_NUMBER for NaN, Infinity, and non-number types", () => {
    expect(() => rupeesToPaise(NaN)).toThrowError(TaxInputError);
    try {
      rupeesToPaise(NaN);
    } catch (err) {
      expect(err).toBeInstanceOf(TaxInputError);
      expect((err as TaxInputError).code).toBe("INVALID_NUMBER");
    }

    try {
      rupeesToPaise(Infinity);
    } catch (err) {
      expect(err).toBeInstanceOf(TaxInputError);
      expect((err as TaxInputError).code).toBe("INVALID_NUMBER");
    }

    try {
      rupeesToPaise("5" as unknown as number);
    } catch (err) {
      expect(err).toBeInstanceOf(TaxInputError);
      expect((err as TaxInputError).code).toBe("INVALID_NUMBER");
    }
  });

  it("throws TaxInputError with NEGATIVE_AMOUNT for negative values", () => {
    try {
      rupeesToPaise(-1);
    } catch (err) {
      expect(err).toBeInstanceOf(TaxInputError);
      expect((err as TaxInputError).code).toBe("NEGATIVE_AMOUNT");
    }
  });

  it("throws TaxInputError with TOO_MANY_DECIMALS for more than 2 decimal places", () => {
    try {
      rupeesToPaise(1.234);
    } catch (err) {
      expect(err).toBeInstanceOf(TaxInputError);
      expect((err as TaxInputError).code).toBe("TOO_MANY_DECIMALS");
    }

    try {
      rupeesToPaise(1.005);
    } catch (err) {
      expect(err).toBeInstanceOf(TaxInputError);
      expect((err as TaxInputError).code).toBe("TOO_MANY_DECIMALS");
    }
  });

  it("throws TaxInputError with AMOUNT_TOO_LARGE above MAX_INPUT_RUPEES", () => {
    try {
      rupeesToPaise(1e12);
    } catch (err) {
      expect(err).toBeInstanceOf(TaxInputError);
      expect((err as TaxInputError).code).toBe("AMOUNT_TOO_LARGE");
    }

    // 10_000_000_000 is allowed
    expect(rupeesToPaise(10_000_000_000)).toBe(1_000_000_000_000);
  });
});

describe("roundToNearestTen", () => {
  it("statutorily rounds paise to the nearest Rs 10 ignoring paise first", () => {
    expect(roundToNearestTen(100_400)).toBe(100_000);
    expect(roundToNearestTen(100_500)).toBe(101_000);
    expect(roundToNearestTen(100_499)).toBe(100_000); // Rs 1004.99 -> Rs 1004 -> Rs 1000
    expect(roundToNearestTen(100_999)).toBe(101_000); // Rs 1009.99 -> Rs 1009 -> Rs 1010
    expect(roundToNearestTen(0)).toBe(0);
    expect(roundToNearestTen(499)).toBe(0); // Rs 4.99 -> Rs 4 -> Rs 0
    expect(roundToNearestTen(500)).toBe(1000); // Rs 5.00 -> Rs 5 -> Rs 10
  });
});

describe("applyBps", () => {
  it("computes amount x basis points / 10,000 rounded down to whole paise", () => {
    expect(applyBps(100_000, 500)).toBe(5000);
    expect(applyBps(100, 500)).toBe(5);
    expect(applyBps(1, 500)).toBe(0);
  });

  it("ensures overflow safety for MAX_INPUT_RUPEES with high bps", () => {
    const result = applyBps(MAX_INPUT_RUPEES * 100, 3000);
    expect(Number.isSafeInteger(result)).toBe(true);
    expect(result).toBe(300_000_000_000);
  });
});

describe("paiseToRupees", () => {
  it("converts paise to rupees", () => {
    expect(paiseToRupees(1025)).toBe(10.25);
  });
});

