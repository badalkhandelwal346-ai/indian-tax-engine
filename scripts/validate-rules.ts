import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PeriodRules } from "../src/rules/types";
import { validatePeriod, type RuleIssue } from "./validateRules";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rulesDir = path.resolve(__dirname, "../src/rules/india");

const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith(".json")).sort();
let totalIssues = 0;
const allIssues: RuleIssue[] = [];

console.log(`Validating rule files in ${rulesDir}...\n`);

for (const file of files) {
  const filePath = path.join(rulesDir, file);
  const taxPeriod = path.basename(file, ".json");
  const content = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(content) as PeriodRules;

  const issues = validatePeriod(file, taxPeriod, data);
  allIssues.push(...issues);
  totalIssues += issues.length;

  for (const issue of issues) {
    console.error(`ERROR: ${issue.file} ${issue.path}: ${issue.message}`);
  }

  // Informational count of unverified sources
  let unverifiedCount = 0;
  for (const regime of ["new", "old"] as const) {
    const r = data[regime];
    if (r?.sources) {
      unverifiedCount += r.sources.filter((s) => s.verification !== "primary-verified").length;
    }
  }
  console.log(
    `[INFO] ${file}: ${unverifiedCount} sources are not "primary-verified" (draft/corroborated/conflict).`,
  );
}

console.log(`\nSummary:`);
console.log(` - Checked files: ${files.length}`);
console.log(` - Total validation issues: ${totalIssues}`);

if (totalIssues > 0) {
  console.error(`\nValidation failed with ${totalIssues} issue(s).`);
  process.exit(1);
} else {
  console.log("\nAll rule files passed schema and integrity validation.");
  process.exit(0);
}

