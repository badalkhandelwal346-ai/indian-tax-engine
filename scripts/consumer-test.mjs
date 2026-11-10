import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

console.log("[consumer-test] Starting end-to-end package consumer verification...");

const rootDir = process.cwd();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "india-tax-engine-consumer-"));
let tarballPath = null;

try {
  // 1. Pack the package in the repo root
  console.log("[consumer-test] Running npm pack in repo root...");
  const packOutput = execSync("npm pack --json", { cwd: rootDir, encoding: "utf-8" });
  const packResult = JSON.parse(packOutput);
  const tarballFilename = packResult[0].filename;
  tarballPath = path.resolve(rootDir, tarballFilename);
  console.log(`[consumer-test] Tarball created: ${tarballFilename}`);

  // Verify packed files whitelist
  const packedFiles = packResult[0].files.map((f) => f.path);
  console.log("[consumer-test] Packed files in tarball:", packedFiles);
  for (const file of packedFiles) {
    if (
      file.startsWith("src/") ||
      file.startsWith("tests/") ||
      file.startsWith("docs/") ||
      file.startsWith("scripts/") ||
      file.startsWith("examples/")
    ) {
      throw new Error(`Packed tarball contains disallowed file: ${file}`);
    }
  }

  // 2. Initialize consumer project in temp directory
  console.log(`[consumer-test] Setting up temporary consumer in ${tempDir}...`);
  execSync("npm init -y", { cwd: tempDir, stdio: "ignore" });

  console.log("[consumer-test] Installing tarball...");
  execSync(`npm install "${tarballPath}"`, { cwd: tempDir, stdio: "inherit" });

  // 3. Test ESM Consumer (.mjs)
  console.log("[consumer-test] Writing and running ESM consumer test (.mjs)...");
  const esmScript = `
import assert from "node:assert";
import { calculateTax, compareRegimes, explain, TaxInputError } from "india-tax-engine";

// 1. Valid case: 12,85,000 salary under 2026-27 new regime
const res = calculateTax({
  taxPeriod: "2026-27",
  regime: "new",
  taxpayer: {
    category: "individual",
    residentialStatus: "resident",
    ageBand: "below-60",
  },
  income: { salary: 1285000 },
});

assert.strictEqual(res.status, "complete", "ESM: Expected status complete");
assert.strictEqual(res.rulesetVersion, "IN-2026-27-new-r1", "ESM: Expected rulesetVersion IN-2026-27-new-r1");
assert.strictEqual(res.taxPayable, 10400, "ESM: Expected taxPayable 10400");
assert.strictEqual(typeof explain(res), "string", "ESM: Expected explain to return string");

// Test compareRegimes
const comp = compareRegimes({
  taxPeriod: "2026-27",
  taxpayer: {
    category: "individual",
    residentialStatus: "resident",
    ageBand: "below-60",
  },
  income: { salary: 1285000 },
});
assert.strictEqual(comp.status, "complete", "ESM: Expected compareRegimes status complete");

// 2. Unsupported case: NRI
const nriRes = calculateTax({
  taxPeriod: "2026-27",
  regime: "new",
  taxpayer: {
    category: "individual",
    residentialStatus: "non-resident",
    ageBand: "below-60",
  },
  income: { salary: 1285000 },
});

assert.strictEqual(nriRes.status, "unsupported", "ESM: Expected status unsupported for NRI");

// 3. Malformed case: unknown tax period
assert.throws(
  () => {
    calculateTax({
      taxPeriod: "2024-25",
      regime: "new",
      taxpayer: {
        category: "individual",
        residentialStatus: "resident",
        ageBand: "below-60",
      },
      income: { salary: 1285000 },
    });
  },
  (err) => err instanceof TaxInputError && err.code === "UNKNOWN_TAX_PERIOD",
  "ESM: Expected UNKNOWN_TAX_PERIOD error code"
);

console.log("PASS: ESM consumer assertions verified successfully.");
`;
  fs.writeFileSync(path.join(tempDir, "consumer-esm.mjs"), esmScript);
  execSync("node consumer-esm.mjs", { cwd: tempDir, stdio: "inherit" });

  // 4. Test CommonJS Consumer (.cjs)
  console.log("[consumer-test] Writing and running CommonJS consumer test (.cjs)...");
  const cjsScript = `
const assert = require("node:assert");
const { calculateTax, compareRegimes, explain, TaxInputError } = require("india-tax-engine");

// 1. Valid case: 12,85,000 salary under 2026-27 new regime
const res = calculateTax({
  taxPeriod: "2026-27",
  regime: "new",
  taxpayer: {
    category: "individual",
    residentialStatus: "resident",
    ageBand: "below-60",
  },
  income: { salary: 1285000 },
});

assert.strictEqual(res.status, "complete", "CJS: Expected status complete");
assert.strictEqual(res.rulesetVersion, "IN-2026-27-new-r1", "CJS: Expected rulesetVersion IN-2026-27-new-r1");
assert.strictEqual(res.taxPayable, 10400, "CJS: Expected taxPayable 10400");
assert.strictEqual(typeof explain(res), "string", "CJS: Expected explain to return string");

// Test compareRegimes
const comp = compareRegimes({
  taxPeriod: "2026-27",
  taxpayer: {
    category: "individual",
    residentialStatus: "resident",
    ageBand: "below-60",
  },
  income: { salary: 1285000 },
});
assert.strictEqual(comp.status, "complete", "CJS: Expected compareRegimes status complete");

// 2. Unsupported case: NRI
const nriRes = calculateTax({
  taxPeriod: "2026-27",
  regime: "new",
  taxpayer: {
    category: "individual",
    residentialStatus: "non-resident",
    ageBand: "below-60",
  },
  income: { salary: 1285000 },
});

assert.strictEqual(nriRes.status, "unsupported", "CJS: Expected status unsupported for NRI");

// 3. Malformed case: unknown tax period
assert.throws(
  () => {
    calculateTax({
      taxPeriod: "2024-25",
      regime: "new",
      taxpayer: {
        category: "individual",
        residentialStatus: "resident",
        ageBand: "below-60",
      },
      income: { salary: 1285000 },
    });
  },
  (err) => err instanceof TaxInputError && err.code === "UNKNOWN_TAX_PERIOD",
  "CJS: Expected UNKNOWN_TAX_PERIOD error code"
);

console.log("PASS: CommonJS consumer assertions verified successfully.");
`;
  fs.writeFileSync(path.join(tempDir, "consumer-cjs.cjs"), cjsScript);
  execSync("node consumer-cjs.cjs", { cwd: tempDir, stdio: "inherit" });

  // 5. Type-check TypeScript consumer against installed package types
  console.log("[consumer-test] Type-checking TypeScript consumer against installed package types...");
  const tsConsumerScript = `
import { calculateTax, compareRegimes, explain, TaxInput, TaxResult, CompareResult } from "india-tax-engine";

const input: TaxInput = {
  taxPeriod: "2026-27",
  regime: "new",
  taxpayer: {
    category: "individual",
    residentialStatus: "resident",
    ageBand: "below-60",
  },
  income: { salary: 1285000 },
};

const result: TaxResult = calculateTax(input);
const comparison: CompareResult = compareRegimes({
  taxPeriod: "2026-27",
  taxpayer: {
    category: "individual",
    residentialStatus: "resident",
    ageBand: "below-60",
  },
  income: { salary: 1285000 },
});
const text: string = explain(result);
`;
  fs.writeFileSync(path.join(tempDir, "consumer-type-check.ts"), tsConsumerScript);

  const tscBin = path.resolve(rootDir, "node_modules/.bin/tsc");
  if (fs.existsSync(tscBin)) {
    execSync(`"${tscBin}" --noEmit --module nodenext --moduleResolution nodenext --strict consumer-type-check.ts`, {
      cwd: tempDir,
      stdio: "inherit",
    });
    console.log("PASS: TypeScript definitions type-checked with nodenext resolution.");
  } else {
    console.log("[NOTE] Skipping TypeScript consumer typecheck: local tsc binary not found.");
  }

  console.log("[consumer-test] ALL consumer checks succeeded!");
} catch (err) {
  console.error("[consumer-test] Consumer test failed:", err);
  process.exitCode = 1;
} finally {
  // 6. Clean up tarball and temp directory
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  if (tarballPath && fs.existsSync(tarballPath)) {
    fs.unlinkSync(tarballPath);
  }
}
