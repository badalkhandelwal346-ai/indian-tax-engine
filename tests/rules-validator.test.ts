import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validatePeriod } from "../scripts/validateRules";
import type { PeriodRules } from "../src/rules/types";

describe("validatePeriod rules validator", () => {
  const readRuleFile = (taxPeriod: string): PeriodRules => {
    const filePath = path.resolve(__dirname, `../src/rules/india/${taxPeriod}.json`);
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as PeriodRules;
  };

  it("passes validation with zero issues for real rule files (2025-26 and 2026-27)", () => {
    for (const period of ["2025-26", "2026-27"]) {
      const data = readRuleFile(period);
      const issues = validatePeriod(`${period}.json`, period, data);
      expect(issues).toEqual([]);
    }
  });

  describe("mutated clone validations catch rule schema violations", () => {
    const clone = (data: PeriodRules): PeriodRules => JSON.parse(JSON.stringify(data));

    it("detects unsorted slabs", () => {
      const data = clone(readRuleFile("2026-27"));
      data.new.slabs[1].upTo = 300_000; // was 800,000, previous is 400,000
      const issues = validatePeriod("2026-27.json", "2026-27", data);
      expect(issues.some((i) => i.path === "new.slabs[1].upTo")).toBe(true);
    });

    it("detects last slab upTo not null", () => {
      const data = clone(readRuleFile("2026-27"));
      const lastIdx = data.new.slabs.length - 1;
      data.new.slabs[lastIdx].upTo = 5_000_000;
      const issues = validatePeriod("2026-27.json", "2026-27", data);
      expect(issues.some((i) => i.path === `new.slabs[${lastIdx}].upTo`)).toBe(true);
    });

    it("detects rateBps out of range (20000)", () => {
      const data = clone(readRuleFile("2026-27"));
      data.new.slabs[0].rateBps = 20_000;
      const issues = validatePeriod("2026-27.json", "2026-27", data);
      expect(issues.some((i) => i.path === "new.slabs[0].rateBps")).toBe(true);
    });

    it("detects wrong framework for the tax period", () => {
      const data = clone(readRuleFile("2026-27"));
      data.new.framework = "IT_ACT_1961"; // 2026-27 expects IT_ACT_2025
      const issues = validatePeriod("2026-27.json", "2026-27", data);
      expect(issues.some((i) => i.path === "new.framework")).toBe(true);
    });

    it("detects taxPeriod mismatch with the file", () => {
      const data = clone(readRuleFile("2026-27"));
      data.new.taxPeriod = "2025-26";
      const issues = validatePeriod("2026-27.json", "2026-27", data);
      expect(issues.some((i) => i.path === "new.taxPeriod")).toBe(true);
    });

    it("detects rulesetVersion bad pattern", () => {
      const data = clone(readRuleFile("2026-27"));
      data.new.rulesetVersion = "invalid-version-string";
      const issues = validatePeriod("2026-27.json", "2026-27", data);
      expect(issues.some((i) => i.path === "new.rulesetVersion")).toBe(true);
    });

    it("detects effective.from after to", () => {
      const data = clone(readRuleFile("2026-27"));
      data.new.effective = { from: "2027-04-01", to: "2026-03-31" };
      const issues = validatePeriod("2026-27.json", "2026-27", data);
      expect(issues.some((i) => i.path === "new.effective")).toBe(true);
    });

    it("detects empty sources array", () => {
      const data = clone(readRuleFile("2026-27"));
      data.new.sources = [];
      const issues = validatePeriod("2026-27.json", "2026-27", data);
      expect(issues.some((i) => i.path === "new.sources")).toBe(true);
    });

    it("detects duplicate ruleId in sources", () => {
      const data = clone(readRuleFile("2026-27"));
      data.new.sources.push({ ...data.new.sources[0] });
      const issues = validatePeriod("2026-27.json", "2026-27", data);
      expect(issues.some((i) => i.message.includes("duplicate ruleId"))).toBe(true);
    });

    it("detects non-https source url", () => {
      const data = clone(readRuleFile("2026-27"));
      data.new.sources[0].url = "http://incometax.gov.in";
      const issues = validatePeriod("2026-27.json", "2026-27", data);
      expect(issues.some((i) => i.path === "new.sources[0].url")).toBe(true);
    });

    it('detects status "verified" with a secondary-corroborated source', () => {
      const data = clone(readRuleFile("2026-27"));
      data.new.status = "verified";
      // sources have "TO CONFIRM" removed but keep secondary-corroborated
      data.new.sources.forEach((s) => {
        s.provision = "Valid Section";
        s.verification = "secondary-corroborated";
      });
      const issues = validatePeriod("2026-27.json", "2026-27", data);
      expect(
        issues.some(
          (i) =>
            i.path === "new.status" &&
            i.message.includes('"verified" requires every source to be "primary-verified"'),
        ),
      ).toBe(true);
    });

    it('detects status "verified" with provision containing "TO CONFIRM"', () => {
      const data = clone(readRuleFile("2026-27"));
      data.new.status = "verified";
      data.new.sources.forEach((s) => {
        s.verification = "primary-verified";
      });
      // But provisions still contain "TO CONFIRM"
      const issues = validatePeriod("2026-27.json", "2026-27", data);
      expect(
        issues.some(
          (i) =>
            i.path === "new.status" &&
            i.message.includes('"verified" is not allowed while a provision still says TO CONFIRM'),
        ),
      ).toBe(true);
    });

    it("detects missing regime", () => {
      const data = clone(readRuleFile("2026-27")) as any;
      delete data.old;
      const issues = validatePeriod("2026-27.json", "2026-27", data);
      expect(issues.some((i) => i.path === "old" && i.message === "missing regime")).toBe(true);
    });
  });
});
