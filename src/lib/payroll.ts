import { daysInMonth, dayOfMonth } from "./dates";

// Constants for Saudi Labor Law
export const GOSI_CAP = 45000;
export const OVERTIME_MULTIPLIER = 1.5; // 150% of hourly rate per Saudi Labor Law
export const WORKING_HOURS_PER_DAY = 8;
export const WORKING_DAYS_PER_MONTH = 30;
export const RAMADAN_HOURS_PER_DAY = 6;

// GOSI Profile rates
// Saudi Standard (2019+): 10% employee, 12% employer on contributory wage
// Saudi Legacy (pre-2019): 9.75% employee, 11.75% employer
// Non-Saudi: 0% employee, 2% employer (occupational hazards only)
export const GOSI_PROFILES = {
  'saudi-standard': { empPct: 10, erPct: 12, label: 'Saudi (Standard 10%)' },
  'saudi-legacy': { empPct: 9.75, erPct: 11.75, label: 'Saudi (Legacy 9.75%)' },
  'non-saudi': { empPct: 0, erPct: 2, label: 'Non-Saudi' },
  'custom': { empPct: 0, erPct: 0, label: 'Custom' },
} as const;

export type GosiProfile = keyof typeof GOSI_PROFILES;

export interface OvertimeInput {
  enabled: boolean;
  hours: number;
  rate?: number; // Custom multiplier, defaults to 1.5
}

export interface PayrollInput {
  mode: 'gross2net' | 'net2gross';
  resident: 'saudi' | 'expat'; // Kept for backward compatibility
  gosiProfile?: GosiProfile; // New: preferred over resident
  basic: number;
  housingMode: 'percent' | 'fixed';
  housingPercent: number;
  housingFixed: number;
  transport: number;
  otherAllow: number;
  insEmpPct: number; // Can be overridden when gosiProfile is 'custom'
  insErPct: number;
  insBase: 'gosi' | 'gross' | 'basic';
  otherDedPct: number;
  flatDed: number;
  monthDivisor: number;
  hoursPerDay: number;
  prorateToDate: boolean;
  assumedBasicForN2G: number;
  grossOverride: number | null;
  // New overtime fields
  overtime?: OvertimeInput;
}

export interface PayrollResult {
  monthly: {
    gross: number;
    net: number;
    insuranceEmployee: number;
    insuranceEmployer: number;
    otherPctAmt: number;
    flat: number;
    overtime?: number;
    grossWithOvertime?: number;
    netWithOvertime?: number;
  };
  yearly: {
    gross: number;
    net: number;
  };
  daily: {
    gross: number;
    net: number;
  };
  hourly: {
    gross: number;
    net: number;
    overtimeRate?: number;
  };
  toDate: {
    insuranceEmployee: number;
    insuranceEmployer: number;
  };
  allocation: {
    employeeInsurance: {
      basic: number;
      housing: number;
      transport: number;
      other: number;
    };
  };
}

export function calcPayroll(args: PayrollInput): PayrollResult {
  const { 
    mode, resident, gosiProfile, basic, housingMode, housingPercent, housingFixed, 
    transport, otherAllow, insEmpPct, insErPct, insBase, 
    otherDedPct, flatDed, monthDivisor, hoursPerDay, 
    prorateToDate, assumedBasicForN2G, grossOverride,
    overtime
  } = args;

  // Determine effective GOSI rates from profile (or fallback to legacy behavior)
  let effectiveEmpPct = insEmpPct;
  let effectiveErPct = insErPct;
  
  if (gosiProfile) {
    const profile = GOSI_PROFILES[gosiProfile];
    if (gosiProfile === 'custom') {
      // Custom profile uses provided rates
      effectiveEmpPct = insEmpPct;
      effectiveErPct = insErPct;
    } else {
      effectiveEmpPct = profile.empPct;
      effectiveErPct = profile.erPct;
    }
  } else {
    // Legacy behavior: use resident field
    if (resident === 'expat') {
      effectiveEmpPct = 0;
      effectiveErPct = 2; // Occupational hazards only
    }
  }
  
  const housingFromBasic = (b: number) => (housingMode === 'percent' ? b * (housingPercent / 100) : housingFixed);

  let gross: number;
  let resolvedBasicForCalc = basic;

  if (grossOverride != null && grossOverride > 0) {
    gross = grossOverride;
    try {
      if (housingMode === 'percent') {
        const denom = 1 + (housingPercent / 100);
        const inferred = (grossOverride - transport - otherAllow) / denom;
        resolvedBasicForCalc = Math.max(0, inferred);
      } else {
        const inferred = grossOverride - housingFixed - transport - otherAllow;
        resolvedBasicForCalc = Math.max(0, inferred);
      }
    } catch (e) {
      // fallback
    }
  } else if (mode === 'net2gross') {
    const targetNet = basic;
    let guessBasic = Math.max(assumedBasicForN2G, 1);
    let guess = 0;
    for (let i = 0; i < 30; i++) {
      const guessHousing = housingFromBasic(guessBasic);
      const guessGross = guessBasic + guessHousing + transport + otherAllow;
      const empBase = insBase === 'gosi' ? Math.min(guessBasic + guessHousing, GOSI_CAP) : (insBase === 'basic' ? guessBasic : guessGross);
      const empIns = empBase * (effectiveEmpPct / 100);
      const otherPctAmt = guessGross * (otherDedPct / 100);
      const net = guessGross - empIns - otherPctAmt - flatDed;
      const diff = targetNet - net;
      guessBasic += diff * 0.6;
      guess = guessGross;
      if (Math.abs(diff) < 0.01) break;
    }
    gross = Math.max(0, guess);
    resolvedBasicForCalc = Math.max(0, guessBasic);
  } else {
    const h = housingFromBasic(basic);
    gross = basic + h + transport + otherAllow;
  }

  const housingForBase = housingFromBasic(resolvedBasicForCalc);
  const baseGosi = Math.min(resolvedBasicForCalc + housingForBase, GOSI_CAP);
  const empBase = insBase === 'gosi' ? baseGosi : (insBase === 'basic' ? resolvedBasicForCalc : gross);
  
  // Calculate insurance using effective rates (profile-based)
  const insuranceEmployee = empBase * (effectiveEmpPct / 100);
  const insuranceEmployer = empBase * (effectiveErPct / 100);
  const otherPctAmt = gross * (otherDedPct / 100);
  const net = Math.max(0, gross - insuranceEmployee - otherPctAmt - flatDed);

  // Calculate daily and hourly rates
  const dailyGross = gross / Math.max(1, monthDivisor);
  const dailyNet = net / Math.max(1, monthDivisor);
  const hourlyGross = dailyGross / Math.max(1, hoursPerDay);
  const hourlyNet = dailyNet / Math.max(1, hoursPerDay);

  // Calculate overtime
  let overtimeAmount = 0;
  let overtimeHourlyRate = 0;
  if (overtime?.enabled && overtime.hours > 0) {
    const multiplier = overtime.rate || OVERTIME_MULTIPLIER;
    overtimeHourlyRate = hourlyGross * multiplier;
    overtimeAmount = overtimeHourlyRate * overtime.hours;
  }

  const grossWithOvertime = gross + overtimeAmount;
  const netWithOvertime = net + overtimeAmount; // Overtime typically not subject to GOSI

  // Prorate to date
  const now = new Date();
  const dim = daysInMonth(now);
  const day = dayOfMonth(now);
  const mtdFactor = prorateToDate ? day / dim : 1;
  const toDate = { 
    insuranceEmployee: insuranceEmployee * mtdFactor, 
    insuranceEmployer: insuranceEmployer * mtdFactor 
  };

  // Allocation of insurance across components
  const alloc = { basic: 0, housing: 0, transport: 0, other: 0 };
  if (insBase === 'gross' && gross > 0 && insuranceEmployee > 0) {
    const parts = { basic: resolvedBasicForCalc, housing: housingFromBasic(resolvedBasicForCalc), transport, other: otherAllow };
    const sum = parts.basic + parts.housing + parts.transport + parts.other;
    if (sum > 0) {
      alloc.basic = insuranceEmployee * (parts.basic / sum);
      alloc.housing = insuranceEmployee * (parts.housing / sum);
      alloc.transport = insuranceEmployee * (parts.transport / sum);
      alloc.other = insuranceEmployee * (parts.other / sum);
    }
  }

  return {
    monthly: { 
      gross, 
      net, 
      insuranceEmployee, 
      insuranceEmployer, 
      otherPctAmt, 
      flat: flatDed,
      overtime: overtimeAmount,
      grossWithOvertime,
      netWithOvertime,
    },
    yearly: { gross: gross * 12, net: net * 12 },
    daily: { gross: dailyGross, net: dailyNet },
    hourly: { 
      gross: hourlyGross, 
      net: hourlyNet,
      overtimeRate: overtimeHourlyRate,
    },
    toDate,
    allocation: { employeeInsurance: alloc },
  };
}

/**
 * Calculate hourly rate for overtime from monthly salary
 */
export function calculateHourlyRate(
  monthlySalary: number, 
  workingDays: number = WORKING_DAYS_PER_MONTH,
  hoursPerDay: number = WORKING_HOURS_PER_DAY
): number {
  return monthlySalary / workingDays / hoursPerDay;
}

/**
 * Calculate overtime pay
 */
export function calculateOvertime(
  hourlyRate: number,
  hours: number,
  multiplier: number = OVERTIME_MULTIPLIER
): { amount: number; rate: number } {
  const rate = hourlyRate * multiplier;
  return {
    amount: rate * hours,
    rate,
  };
}

/**
 * Get GOSI profile from legacy resident field
 */
export function gosiProfileFromResident(resident: 'saudi' | 'expat'): GosiProfile {
  return resident === 'expat' ? 'non-saudi' : 'saudi-legacy';
}

/**
 * Calculate contributory wage (GOSI base)
 * This is basic + housing, capped at GOSI_CAP
 */
export function calcContributoryWage(basic: number, housing: number): number {
  return Math.min(basic + housing, GOSI_CAP);
}

/**
 * Get effective GOSI rates for a profile
 */
export function getGosiRates(profile: GosiProfile, customEmpPct?: number, customErPct?: number): { empPct: number; erPct: number } {
  if (profile === 'custom') {
    return { empPct: customEmpPct ?? 0, erPct: customErPct ?? 0 };
  }
  return { empPct: GOSI_PROFILES[profile].empPct, erPct: GOSI_PROFILES[profile].erPct };
}
