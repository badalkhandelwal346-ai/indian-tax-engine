export interface GoldenCase {
  label: string;
  regime: "new" | "old";
  salary: number;
  totalIncome: number;
  slabTax: number;
  payable: number;
}

export const GOLDEN_CASES: GoldenCase[] = [
  { label: "new 12,75,000", regime: "new", salary: 1275000, totalIncome: 1200000, slabTax: 60000, payable: 0 },
  { label: "new 12,00,000", regime: "new", salary: 1200000, totalIncome: 1125000, slabTax: 52500, payable: 0 },
  { label: "new 12,85,000", regime: "new", salary: 1285000, totalIncome: 1210000, slabTax: 61500, payable: 10400 },
  { label: "new 13,00,000", regime: "new", salary: 1300000, totalIncome: 1225000, slabTax: 63750, payable: 26000 },
  { label: "new 15,00,000", regime: "new", salary: 1500000, totalIncome: 1425000, slabTax: 93750, payable: 97500 },
  { label: "old 5,50,000",  regime: "old", salary: 550000,  totalIncome: 500000,  slabTax: 12500, payable: 0 },
  { label: "old 6,00,000",  regime: "old", salary: 600000,  totalIncome: 550000,  slabTax: 22500, payable: 23400 },
];

