# AGENTS.md - standing rules for india-tax-engine

## What this is
A deterministic, offline, zero-runtime-dependency TypeScript library that calculates Indian income tax for resident individuals below 60 with salary income only; new and old regime; tax periods 2025-26 and 2026-27. It returns an explainable, traceable result. It is a prototype (v0.x).

## Source of truth
1. docs/reference/03-final-prd-and-architecture.pdf (PRD) - wins conflicts
2. docs/reference/02-product-review-and-roadmap.pdf
3. docs/reference/01-product-brief.pdf
Re-read the PRD whenever unsure.

## Hard rules
1. Zero runtime dependencies. devDependencies only (typescript, vitest, tsup, tsx, @types/node).
2. src/ must never use network, clock (Date), randomness, or file reads.
3. Money: integer paise internally, INR rupees in the public API. Statutory rounding to the nearest Rs 10 (paise ignored first) on total income AND on payable tax.
4. Never silently ignore input. Malformed input throws TaxInputError with a stable code. Valid-but-unsupported input returns { status: "unsupported", reasons }.
5. Surcharge is NOT implemented. Total income above Rs 50,00,000 returns unsupported.
6. Tax numbers live only in src/rules/india/*.json. Never hardcode tax numbers in code.
7. Never set a rule source to "primary-verified" or a ruleset status to "verified" unless you personally read the primary source (incometax.gov.in, the Act, Finance Act) in this session and can cite provision and date. Default to "draft" / "secondary-corroborated".
8. Never change an expected test value just to make a test pass. If a test fails, recompute by hand, decide whether the code or the expectation is wrong, and explain which in your report.
9. No marketing claims ("first", "only", "most accurate", "always up to date") in any file. Output is an informational estimate, not tax advice.
10. Do not publish to npm, do not push to any remote, do not rewrite git history.

## Working style
- One prompt at a time, only that prompt's scope.
- Self-resolve problems (type errors, tooling, versions, failing tests) with the smallest fix that keeps intent. Ask the owner only for tax-logic, scope, public-API or credential decisions.
- Each prompt ends with: run the checks, all green, then commit with the given message.
- Report format after each prompt: (a) what you did, (b) files changed, (c) test/check output summary, (d) deviations or problems you resolved and how, (e) anything the owner must verify.
