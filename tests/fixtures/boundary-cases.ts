export interface BoundaryCase {
  label: string;
  regime: "new" | "old";
  salary: number;
  chapterVIA?: number;
  totalIncome: number;
  payable: number;
}

/**
 * NOTE ON OLD REGIME CLIFF AT Rs 5,00,000:
 * The sharp tax jump from Rs 0 at Rs 5,00,000 to Rs 13,000 at Rs 5,00,010 reflects the CURRENT
 * unconfirmed reading (no marginal relief for section 87A rebate under the old regime, with rule
 * status marked as "open-conflict"). This must be revisited and updated if Phase 0 primary-source
 * verification establishes statutory marginal relief for the old regime.
 */
export const BOUNDARY_CASES: BoundaryCase[] = [
  // --- NEW regime cases (standard deduction 75,000) ---
  { label: "new 12,74,990", regime: "new", salary: 1274990, totalIncome: 1199990, payable: 0 },
  { label: "new 12,75,000", regime: "new", salary: 1275000, totalIncome: 1200000, payable: 0 },
  { label: "new 12,75,004", regime: "new", salary: 1275004, totalIncome: 1200000, payable: 0 },
  { label: "new 12,75,004.99", regime: "new", salary: 1275004.99, totalIncome: 1200000, payable: 0 },
  { label: "new 12,75,005", regime: "new", salary: 1275005, totalIncome: 1200010, payable: 10 },
  { label: "new 12,75,010", regime: "new", salary: 1275010, totalIncome: 1200010, payable: 10 },
  { label: "new 12,85,000", regime: "new", salary: 1285000, totalIncome: 1210000, payable: 10400 },
  { label: "new 13,00,000", regime: "new", salary: 1300000, totalIncome: 1225000, payable: 26000 },
  { label: "new 13,45,000", regime: "new", salary: 1345000, totalIncome: 1270000, payable: 72800 },
  { label: "new 13,50,000", regime: "new", salary: 1350000, totalIncome: 1275000, payable: 74100 },

  // --- OLD regime cases (standard deduction 50,000) ---
  { label: "old 5,49,990", regime: "old", salary: 549990, totalIncome: 499990, payable: 0 },
  { label: "old 5,50,000", regime: "old", salary: 550000, totalIncome: 500000, payable: 0 },
  { label: "old 5,50,005", regime: "old", salary: 550005, totalIncome: 500010, payable: 13000 },
  { label: "old 5,50,010", regime: "old", salary: 550010, totalIncome: 500010, payable: 13000 },
  { label: "old 6,00,000", regime: "old", salary: 600000, totalIncome: 550000, payable: 23400 },
  { label: "old 7,50,000 chVIA 2L", regime: "old", salary: 750000, chapterVIA: 200000, totalIncome: 500000, payable: 0 },
  { label: "old 7,50,000 chVIA 1.9999L", regime: "old", salary: 750000, chapterVIA: 199990, totalIncome: 500010, payable: 13000 },

  // --- 4 Additional Custom Hand-Computed Boundary Cases ---

  /**
   * Additional Case 1: Old regime at the Rs 10,00,000 slab transition boundary.
   * Salary: 10,50,000. Standard deduction: 50,000. Total income = 10,00,000.
   * Slabs:
   *   0 to 2.5L: Nil
   *   2.5L to 5L: 2,50,000 * 5% = 12,500
   *   5L to 10L: 5,00,000 * 20% = 1,00,000
   * Total slab tax = 1,12,500. No rebate (> 5L).
   * Cess = 4% of 1,12,500 = 4,500.
   * Total payable = 1,17,000.
   */
  {
    label: "old 10,50,000 (10L slab boundary)",
    regime: "old",
    salary: 1050000,
    totalIncome: 1000000,
    payable: 117000,
  },

  /**
   * Additional Case 2: Old regime just above Rs 10,00,000 slab transition with rounding.
   * Salary: 10,50,010. Standard deduction: 50,000. Total income = 10,00,010.
   * Slabs:
   *   0 to 10L: 1,12,500
   *   Above 10L: 10 * 30% = 3 Rs (300 paise).
   * Total slab tax = 1,12,503 Rs.
   * Cess = 4% of 1,12,503 = 4,500.12 Rs.
   * Total before rounding = 1,17,003.12 Rs.
   * Statutory rounding: paise ignored -> 1,17,003 -> nearest 10 Rs = 1,17,000.
   */
  {
    label: "old 10,50,010 (just above 10L slab)",
    regime: "old",
    salary: 1050010,
    totalIncome: 1000010,
    payable: 117000,
  },

  /**
   * Additional Case 3: New regime marginal relief near crossover.
   * Salary: 13,45,580. Standard deduction: 75,000. Total income = 12,70,580.
   * Slab tax:
   *   0 to 12L: 60,000
   *   12L to 12,70,580: 70,580 * 15% = 10,587.
   * Total slab tax = 70,587.
   * Marginal relief cap: totalIncome - 12L = 70,580.
   * Since slab tax 70,587 > 70,580, tax is capped at 70,580 (relief = 7).
   * Cess = 4% of 70,580 = 2,823.20.
   * Total before rounding = 73,403.20.
   * Statutory rounding: paise ignored -> 73,403 -> nearest 10 Rs = 73,400.
   */
  {
    label: "new 13,45,580 (marginal relief near crossover)",
    regime: "new",
    salary: 1345580,
    totalIncome: 1270580,
    payable: 73400,
  },

  /**
   * Additional Case 4: New regime at the Rs 16,00,000 slab transition boundary.
   * Salary: 16,75,000. Standard deduction: 75,000. Total income = 16,00,000.
   * Slabs:
   *   0 to 4L: 0
   *   4L to 8L: 20,000
   *   8L to 12L: 40,000
   *   12L to 16L: 4,00,000 * 15% = 60,000
   * Total slab tax = 1,20,000.
   * Marginal relief cap = 4,00,000 (slab tax 1,20,000 < cap, no relief).
   * Cess = 4% of 1,20,000 = 4,800.
   * Total payable = 1,24,800.
   */
  {
    label: "new 16,75,000 (16L slab boundary)",
    regime: "new",
    salary: 1675000,
    totalIncome: 1600000,
    payable: 124800,
  },
];

