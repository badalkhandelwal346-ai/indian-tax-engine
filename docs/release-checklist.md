# Release Checklist (Owner Task List)

This checklist outlines the mandatory steps for the package owner before publishing `india-tax-engine` v0.1.0 to npm.

> [!IMPORTANT]
> If rules are still "draft" at publish time, the owner must keep the "prototype" wording.

---

## Owner Pre-Publish Checklist

- [ ] **Phase 0 Primary-Source Verification**: Every item in `docs/sources-and-methodology.md` confirmed against primary sources (`incometax.gov.in`, the Act, Finance Act); update rule files (`provision`, `retrievedOn`, `verification`) and statuses ONLY with evidence.
- [ ] **Official Calculator Cross-Check**: Golden and boundary cases cross-checked against the official Income Tax Department calculator (`https://www.incometax.gov.in/`).
- [ ] **Package Name Availability**: `npm view india-tax-engine` still returns 404 (name free) on publish day, plus a fresh npm/GitHub search for near-identical packages.
- [ ] **Disclaimer & Limitations Accuracy**: README disclaimer and limitations still accurate.
- [ ] **npm Publish**: `npm login`, then `npm publish --access public` (add `--provenance` only if publishing from supported CI).
- [ ] **Git Tag & Metadata**: `git tag v0.1.0`, push to GitHub, add repository/bugs/homepage fields to `package.json` in a follow-up commit.
- [ ] **Submission Proof**: Fresh-folder install proof screenshot for the submission pack.
