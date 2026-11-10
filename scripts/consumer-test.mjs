import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

console.log("[consumer-test] Starting end-to-end package consumer verification...");

const rootDir = process.cwd();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "india-tax-engine-consumer-"));
let tarballPath = null;

try {
  // 1. Pack the package
  console.log("[consumer-test] Creating tarball via npm pack...");
  const packOutput = execSync("npm pack --json", { cwd: rootDir, encoding: "utf-8" });
  const packResult = JSON.parse(packOutput);
  const tarballFilename = packResult[0].filename;
  tarballPath = path.resolve(rootDir, tarballFilename);

  // Verify packed files whitelist
  const packedFiles = packResult[0].files.map((f) => f.path);
  console.log("[consumer-test] Packed files:", packedFiles);
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
  fs.writeFileSync(
    path.join(tempDir, "package.json"),
    JSON.stringify({
      name: "test-consumer",
      version: "1.0.0",
      type: "module",
    }),
  );

  console.log("[consumer-test] Installing tarball...");
  execSync(`npm install "${tarballPath}"`, { cwd: tempDir, stdio: "inherit" });

  // 3. Test ESM Consumer
  console.log("[consumer-test] Running ESM consumer test...");
  const esmScript = `
import assert from "node:assert";
import { calculateTax, TaxInputError } from "india-tax-engine";

// Valid case: 12,85,000 salary -> 10,400 payable
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

assert.strictEqual(res.status, "complete", "Expected complete status");
assert.strictEqual(res.rulesetVersion, "IN-2026-27-new-r1", "Expected IN-2026-27-new-r1 ruleset");
assert.strictEqual(res.taxPayable, 10400, "Expected taxPayable 10400");

// Unsupported case: NRI
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

assert.strictEqual(nriRes.status, "unsupported", "Expected unsupported status for NRI");

// Malformed case: unknown tax period
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
  "Expected UNKNOWN_TAX_PERIOD TaxInputError"
);

console.log("[consumer-test] ESM consumer assertions passed!");
`;
  fs.writeFileSync(path.join(tempDir, "test-esm.mjs"), esmScript);
  execSync("node test-esm.mjs", { cwd: tempDir, stdio: "inherit" });

  // 4. Test CommonJS Consumer
  console.log("[consumer-test] Running CommonJS consumer test...");
  const cjsScript = `
const assert = require("node:assert");
const { calculateTax, TaxInputError } = require("india-tax-engine");

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

assert.strictEqual(res.status, "complete", "Expected complete status");
assert.strictEqual(res.rulesetVersion, "IN-2026-27-new-r1", "Expected IN-2026-27-new-r1 ruleset");
assert.strictEqual(res.taxPayable, 10400, "Expected taxPayable 10400");

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

assert.strictEqual(nriRes.status, "unsupported", "Expected unsupported status for NRI");

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
  "Expected UNKNOWN_TAX_PERIOD TaxInputError"
);

console.log("[consumer-test] CommonJS consumer assertions passed!");
`;
  fs.writeFileSync(path.join(tempDir, "test-cjs.cjs"), cjsScript);
  execSync("node test-cjs.cjs", { cwd: tempDir, stdio: "inherit" });

  console.log("[consumer-test] ALL consumer checks succeeded!");
} catch (err) {
  console.error("[consumer-test] Consumer test failed:", err);
  process.exitCode = 1;
} finally {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  if (tarballPath && fs.existsSync(tarballPath)) {
    fs.unlinkSync(tarballPath);
  }
}
