# Using india-tax-engine in Next.js

`india-tax-engine` has zero runtime dependencies, operates synchronously, and makes no network or filesystem calls. It runs in Next.js App Router Server Components, Route Handlers (API routes), Server Actions, or Client Components.

## 1. App Router API Route (`app/api/tax/route.ts`)

```ts
import { NextResponse } from "next/server";
import { calculateTax, TaxInputError, type TaxInput } from "india-tax-engine";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TaxInput;
    const result = calculateTax(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TaxInputError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            field: error.field,
          },
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Unexpected server error" } },
      { status: 500 },
    );
  }
}
```

## 2. Server Component (`app/tax-summary/page.tsx`)

```tsx
import { compareRegimes, explain } from "india-tax-engine";

export default function TaxSummaryPage() {
  const comparison = compareRegimes({
    taxPeriod: "2026-27",
    taxpayer: {
      category: "individual",
      residentialStatus: "resident",
      ageBand: "below-60",
    },
    income: { salary: 1500000 },
    deductions: { chapterVIA: 150000 },
  });

  if (comparison.status === "unsupported") {
    return (
      <div>
        <h2>Calculation Unsupported</h2>
        <ul>
          {comparison.reasons.map((r, i) => (
            <li key={i}>
              [{r.code}] {r.message}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <main>
      <h1>Tax Comparison (FY 2026-27)</h1>
      <pre>{explain(comparison)}</pre>
      <p>
        Recommended: <strong>{comparison.cheaper}</strong> regime (saves ₹
        {comparison.difference.toLocaleString("en-IN")})
      </p>
    </main>
  );
}
```
