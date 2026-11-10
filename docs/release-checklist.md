# Release Checklist (Owner Task List)

This checklist outlines the mandatory steps the package owner must complete before publishing `india-tax-engine` to npm.

> [!IMPORTANT]
> The package must retain its "prototype (v0.x)" status and "draft" rule status until Phase 0 primary-source verification is fully complete.

---

## 1. Phase 0 Primary-Source Verification
- [ ] Read the enacted primary statutory texts on [incometax.gov.in](https://www.incometax.gov.in/) (Finance Act 2024 / 2025, Income-tax Act 1961, and Income-tax Act 2025).
- [ ] Confirm slab thresholds and rates for both FY 2025-26 and FY 2026-27.
- [ ] Confirm standard deduction provisions (s.16(ia)).
- [ ] Confirm Section 87A rebate limits, formula, and statutory marginal relief wording.
- [ ] Resolve the old-regime Section 87A marginal relief conflict.
- [ ] Update rule files under `src/rules/india/` with statutory citations, verified dates, and promote status to `"verified"` once confirmed.

## 2. Cross-Check Against Official Calculator
- [ ] Run the 7 golden test cases on the Income Tax Department's official portal calculator.
- [ ] Run the 4 boundary cases on the official calculator.
- [ ] Verify that statutory rounding to nearest Rs 10 matches exactly in both total income and payable tax.

## 3. Package and Metadata Pre-Flight
- [ ] Verify npm package name availability (`npm view india-tax-engine`).
- [ ] Verify package version in `package.json` (`0.0.1` for prototype or bump to `0.1.0` if ready).
- [ ] Verify verbatim disclaimer is prominent in `README.md`.
- [ ] Confirm `package.json` contains no `"dependencies"`.
- [ ] Dry-run package artifact with `npm run pack:check` and ensure only `dist/`, `README.md`, `LICENSE`, `CHANGELOG.md`, and `package.json` are packaged.

## 4. Automated Verification Suite
- [ ] Run `npm run verify` (`typecheck` + `validate-rules` + `test`).
- [ ] Run `npm run consumer-test` (builds, packs tarball, installs in fresh temp consumer, and verifies both ESM and CJS imports).

## 5. Publishing to npm
- [ ] Authenticate to npm: `npm login`.
- [ ] Execute release build and verification: `npm run prepublishOnly`.
- [ ] Publish package: `npm publish --access public` (or dry-run with `npm publish --dry-run`).
- [ ] Create and push git release tag: `git tag v0.1.0 && git push origin v0.1.0`.

## 6. Fresh-Install Verification Proof
- [ ] In a clean external directory, execute:
  ```bash
  mkdir test-fresh-install && cd test-fresh-install
  npm init -y
  npm install india-tax-engine
  node -e 'const { calculateTax } = require("india-tax-engine"); console.log(calculateTax({ taxPeriod: "2026-27", regime: "new", taxpayer: { category: "individual", residentialStatus: "resident", ageBand: "below-60" }, income: { salary: 1285000 } }));'
  ```
- [ ] Verify output gives `status: "complete"`, `rulesetVersion: "IN-2026-27-new-r1"`, and `taxPayable: 10400`.
