import { describe, expect, it } from "vitest";
import { TaxInputError } from "../src/errors";
import { SUPPORTED_PERIODS, getRules } from "../src/rules/registry";

describe("rules registry", () => {
  it("loads both periods x both regimes with correct rulesetVersion, framework, and effective dates", () => {
    expect(SUPPORTED_PERIODS).toEqual(["2025-26", "2026-27"]);

    const r25new = getRules("2025-26", "new");
    expect(r25new.rulesetVersion).toBe("IN-2025-26-new-r1");
    expect(r25new.framework).toBe("IT_ACT_1961");
    expect(r25new.regime).toBe("new");
    expect(r25new.taxPeriod).toBe("2025-26");
    expect(r25new.status).toBe("draft");
    expect(r25new.effective).toEqual({ from: "2025-04-01", to: "2026-03-31" });

    const r25old = getRules("2025-26", "old");
    expect(r25old.rulesetVersion).toBe("IN-2025-26-old-r1");
    expect(r25old.framework).toBe("IT_ACT_1961");
    expect(r25old.regime).toBe("old");
    expect(r25old.taxPeriod).toBe("2025-26");
    expect(r25old.status).toBe("draft");
    expect(r25old.effective).toEqual({ from: "2025-04-01", to: "2026-03-31" });

    const r26new = getRules("2026-27", "new");
    expect(r26new.rulesetVersion).toBe("IN-2026-27-new-r1");
    expect(r26new.framework).toBe("IT_ACT_2025");
    expect(r26new.regime).toBe("new");
    expect(r26new.taxPeriod).toBe("2026-27");
    expect(r26new.status).toBe("draft");
    expect(r26new.effective).toEqual({ from: "2026-04-01", to: "2027-03-31" });

    const r26old = getRules("2026-27", "old");
    expect(r26old.rulesetVersion).toBe("IN-2026-27-old-r1");
    expect(r26old.framework).toBe("IT_ACT_2025");
    expect(r26old.regime).toBe("old");
    expect(r26old.taxPeriod).toBe("2026-27");
    expect(r26old.status).toBe("draft");
    expect(r26old.effective).toEqual({ from: "2026-04-01", to: "2027-03-31" });
  });

  it("throws UNKNOWN_TAX_PERIOD for invalid or prototype property keys", () => {
    const invalidPeriods = ["constructor", "__proto__", "2024-25", ""];
    for (const period of invalidPeriods) {
      try {
        getRules(period, "new");
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(TaxInputError);
        expect((err as TaxInputError).code).toBe("UNKNOWN_TAX_PERIOD");
        expect((err as TaxInputError).field).toBe("taxPeriod");
      }
    }
  });

  it("throws UNKNOWN_REGIME for invalid regime", () => {
    try {
      getRules("2025-26", "middle");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TaxInputError);
      expect((err as TaxInputError).code).toBe("UNKNOWN_REGIME");
      expect((err as TaxInputError).field).toBe("regime");
    }
  });

  it("ensures identical calculation parameters between 2025-26 and 2026-27 for each regime", () => {
    for (const regime of ["new", "old"] as const) {
      const r25 = getRules("2025-26", regime);
      const r26 = getRules("2026-27", regime);

      expect(r25.slabs).toEqual(r26.slabs);
      expect(r25.standardDeduction).toEqual(r26.standardDeduction);
      expect(r25.rebate).toEqual(r26.rebate);
      expect(r25.cessBps).toEqual(r26.cessBps);
      expect(r25.rounding).toEqual(r26.rounding);
      expect(r25.support).toEqual(r26.support);

      // but different framework and rulesetVersion
      expect(r25.framework).not.toBe(r26.framework);
      expect(r25.rulesetVersion).not.toBe(r26.rulesetVersion);
    }
  });

  it("ensures every slab list is ascending with last upTo as null, and each ruleset has at least one source", () => {
    for (const period of ["2025-26", "2026-27"]) {
      for (const regime of ["new", "old"] as const) {
        const rules = getRules(period, regime);

        // Sources check
        expect(rules.sources.length).toBeGreaterThan(0);
        for (const source of rules.sources) {
          expect(source.ruleId).toBeDefined();
          expect(source.provision).toBeDefined();
          expect(source.url).toBe("https://www.incometax.gov.in/");
          expect(source.retrievedOn).toBe("2026-11-09");
          expect(["secondary-corroborated", "primary-verified", "open-conflict"]).toContain(source.verification);
        }

        // Slab ascending and structure check
        const slabs = rules.slabs;
        expect(slabs.length).toBeGreaterThan(0);
        for (let i = 0; i < slabs.length - 1; i++) {
          const current = slabs[i];
          const next = slabs[i + 1];
          expect(current.upTo).not.toBeNull();
          if (next.upTo !== null) {
            expect(next.upTo).toBeGreaterThan(current.upTo!);
          }
          expect(next.rateBps).toBeGreaterThanOrEqual(current.rateBps);
        }
        expect(slabs[slabs.length - 1].upTo).toBeNull();
      }
    }
  });
});
