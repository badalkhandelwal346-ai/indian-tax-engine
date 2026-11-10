import { describe, expect, it } from "vitest";
import { slabTax } from "../src/core/slab";
import { rupeesToPaise } from "../src/money/money";
import { getRules } from "../src/rules/registry";
import type { Slab } from "../src/rules/types";

describe("slabTax", () => {
  const newSlabs = getRules("2026-27", "new").slabs;
  const oldSlabs = getRules("2026-27", "old").slabs;

  describe("new regime", () => {
    it("calculates layered tax across standard slab limits", () => {
      expect(slabTax(rupeesToPaise(0), newSlabs)).toBe(0);
      expect(slabTax(rupeesToPaise(400_000), newSlabs)).toBe(0);
      expect(slabTax(rupeesToPaise(800_000), newSlabs)).toBe(rupeesToPaise(20_000));
      expect(slabTax(rupeesToPaise(1_200_000), newSlabs)).toBe(rupeesToPaise(60_000));
      expect(slabTax(rupeesToPaise(1_600_000), newSlabs)).toBe(rupeesToPaise(120_000));
      expect(slabTax(rupeesToPaise(2_000_000), newSlabs)).toBe(rupeesToPaise(200_000));
      expect(slabTax(rupeesToPaise(2_400_000), newSlabs)).toBe(rupeesToPaise(300_000));
      expect(slabTax(rupeesToPaise(3_000_000), newSlabs)).toBe(rupeesToPaise(480_000));
    });

    it("calculates exact paise at boundaries", () => {
      expect(slabTax(rupeesToPaise(399_999), newSlabs)).toBe(0);
      expect(slabTax(rupeesToPaise(400_001), newSlabs)).toBe(5);
      expect(slabTax(rupeesToPaise(800_001), newSlabs)).toBe(2_000_010);
      expect(slabTax(rupeesToPaise(1_200_001), newSlabs)).toBe(6_000_015);
    });
  });

  describe("old regime", () => {
    it("calculates layered tax across standard slab limits", () => {
      expect(slabTax(rupeesToPaise(250_000), oldSlabs)).toBe(0);
      expect(slabTax(rupeesToPaise(500_000), oldSlabs)).toBe(rupeesToPaise(12_500));
      expect(slabTax(rupeesToPaise(1_000_000), oldSlabs)).toBe(rupeesToPaise(112_500));
      expect(slabTax(rupeesToPaise(1_500_000), oldSlabs)).toBe(rupeesToPaise(262_500));
    });

    it("calculates exact paise at boundaries", () => {
      expect(slabTax(rupeesToPaise(250_001), oldSlabs)).toBe(5);
      expect(slabTax(rupeesToPaise(500_001), oldSlabs)).toBe(1_250_020);
      expect(slabTax(rupeesToPaise(1_000_001), oldSlabs)).toBe(11_250_030);
    });
  });

  describe("custom slab list", () => {
    it("is pure and does not depend on JSON rule files", () => {
      const customSlabs: Slab[] = [
        { upTo: 100_000, rateBps: 1000 },
        { upTo: null, rateBps: 2000 },
      ];
      // Rs 3,00,000 -> 10,000 (10% on 1L) + 40,000 (20% on 2L) = Rs 50,000 (5,000,000 paise)
      expect(slabTax(rupeesToPaise(300_000), customSlabs)).toBe(rupeesToPaise(50_000));
    });
  });
});
