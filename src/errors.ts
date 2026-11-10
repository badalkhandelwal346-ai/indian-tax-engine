export type TaxInputErrorCode =
  | "INVALID_INPUT" | "MISSING_FIELD" | "INVALID_NUMBER" | "NEGATIVE_AMOUNT"
  | "TOO_MANY_DECIMALS" | "AMOUNT_TOO_LARGE" | "UNKNOWN_TAX_PERIOD" | "UNKNOWN_REGIME";

export class TaxInputError extends Error {
  constructor(
    public readonly code: TaxInputErrorCode,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "TaxInputError";
  }
}

