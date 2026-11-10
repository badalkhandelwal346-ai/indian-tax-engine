# Next.js App Router Integration

This example demonstrates how to use `india-tax-engine` in a Next.js App Router route handler (`app/api/tax/route.ts`).

`india-tax-engine` operates completely in memory with zero network, filesystem, clock, or external dependencies, making it safe for both Node.js and Edge runtimes.

## Route Handler (`app/api/tax/route.ts`)

```ts
import { NextResponse } from "next/server";
import { calculateTax, TaxInputError, type TaxInput } from "india-tax-engine";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Malformed JSON body" } },
      { status: 400 },
    );
  }

  try {
    // calculateTax validates input schema and throws TaxInputError on invalid input
    const result = calculateTax(body as TaxInput);

    if (result.status === "unsupported") {
      // Input is structurally valid but falls outside supported scope (e.g. NRI, income > 50L)
      return NextResponse.json(
        {
          status: "unsupported",
          reasons: result.reasons,
        },
        { status: 422 },
      );
    }

    // Calculation completed successfully
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof TaxInputError) {
      // Malformed input (e.g. negative amount, unknown period, missing required field)
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

    // Unexpected internal server error
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}
```
