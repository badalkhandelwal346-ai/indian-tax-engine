export { calculateTax } from "./api/calculateTax";
export { compareRegimes } from "./api/compareRegimes";
export { explain, formatINR } from "./api/explain";
export { TaxInputError } from "./errors";
export type { TaxInputErrorCode } from "./errors";
export { SUPPORTED_PERIODS as SUPPORTED_TAX_PERIODS } from "./rules/registry";
export type {
  Regime,
  TaxPeriod,
  TaxInput,
  CompareInput,
  Reason,
  Warning,
  Step,
  StepCode,
  CompleteResult,
  UnsupportedResult,
  TaxResult,
  RegimeComparison,
  CompareResult,
} from "./api/types";
