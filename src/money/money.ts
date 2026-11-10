import { TaxInputError } from "../errors";

/** Integer paise. 1 rupee = 100 paise. */
export type Paise = number;

/** Rs 1000 crore. Keeps paise x basis-points safely below Number.MAX_SAFE_INTEGER. */
export const MAX_INPUT_RUPEES = 10_000_000_000;

export function rupeesToPaise(rupees: number, field = "amount"): Paise {
  if (typeof rupees !== "number" || !Number.isFinite(rupees))
    throw new TaxInputError("INVALID_NUMBER", `${field} must be a finite number`, field);
  if (rupees < 0)
    throw new TaxInputError("NEGATIVE_AMOUNT", `${field} cannot be negative`, field);
  if (rupees > MAX_INPUT_RUPEES)
    throw new TaxInputError("AMOUNT_TOO_LARGE", `${field} exceeds the supported limit`, field);
  const paise = Math.round(rupees * 100);
  // A value with at most 2 decimals round-trips exactly; anything else does not.
  if (paise / 100 !== rupees)
    throw new TaxInputError("TOO_MANY_DECIMALS", `${field} allows at most 2 decimal places`, field);
  return paise === 0 ? 0 : paise; // normalise -0
}

export const paiseToRupees = (p: Paise): number => p / 100;

/** Statutory rounding: ignore paise first, then round to the nearest Rs 10 (5 rounds up). */
export function roundToNearestTen(p: Paise): Paise {
  const rupees = Math.floor(p / 100);
  const rem = rupees % 10;
  const base = rupees - rem;
  return (rem >= 5 ? base + 10 : base) * 100;
}

/** amount x basis points / 10,000, rounded down to whole paise. */
export const applyBps = (p: Paise, bps: number): Paise => Math.floor((p * bps) / 10_000);

