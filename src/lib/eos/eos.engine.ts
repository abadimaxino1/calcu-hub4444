/**
 * Saudi Labor Law EOS Calculator
 * 
 * Reference: Saudi Labor Law Articles 84 & 85
 * 
 * Article 84 (Employer Termination / End of Contract):
 * - Full entitlement regardless of tenure
 * - First 5 years: half month wage per year
 * - After 5 years: full month wage per year
 * 
 * Article 85 (Employee Resignation):
 * - Less than 2 years: 0% entitlement
 * - 2-5 years: 1/3 of entitlement
 * - 5-10 years: 2/3 of entitlement  
 * - 10+ years: Full entitlement
 * 
 * EOS Base Wage = Last Monthly Wage (includes basic + housing + regular allowances)
 * Daily Wage = Monthly Wage / 30
 */

export type TerminationType =
  | 'article84' // Employer termination - full EOS
  | 'article85' // Employee resignation - prorated
  | 'employerTermination' // Alias for article84
  | 'employeeResignation' // Alias for article85
  | 'mutualAgreement'
  | 'retirement'
  | 'death'
  | 'disability'
  | 'forceMajeure'
  | 'probationEnd'
  | 'contractEnd'
  | 'constructiveDismissal'
  | 'redundancy'
  | 'transferOfBusiness'
  ;

// Map termination types to labor law articles
export const ARTICLE_MAPPING: Record<TerminationType, 'article84' | 'article85'> = {
  'article84': 'article84',
  'article85': 'article85',
  'employerTermination': 'article84',
  'employeeResignation': 'article85',
  'mutualAgreement': 'article84', // Usually full EOS by agreement
  'retirement': 'article84',
  'death': 'article84',
  'disability': 'article84',
  'forceMajeure': 'article84',
  'probationEnd': 'article85', // No entitlement during probation
  'contractEnd': 'article84',
  'constructiveDismissal': 'article84',
  'redundancy': 'article84',
  'transferOfBusiness': 'article84',
};

export type EosInput = {
  start: string;
  end: string;
  basic: number;
  housingMode: 'percent' | 'fixed';
  housingPercent: number;
  housingFixed: number;
  baseType: 'basic' | 'basic_plus_housing';
  monthDivisor: number;
  leaveDays: number;
  separation: TerminationType;
  extras: number;
  deductions: number;
  // Optional: additional allowances to include in wage (not housing)
  otherAllowances?: number;
};

export type EosResult = {
  duration: { years: number; months: number; days: number; totalDays: number; totalYearsDecimal: number };
  baseMonthly: number;
  dailyWage: number;
  rawMonths: number;
  rawEOS: number;
  factor: number;
  finalEOS: number;
  leaveEncash: number;
  extras: number;
  deductions: number;
  total: number;
  terminationType: TerminationType;
  article: 'article84' | 'article85';
  entitlementMonths: number;
  entitlementAmount: number;
  // Breakdown for display
  breakdown: {
    first5YearsMonths: number;
    first5YearsAmount: number;
    after5YearsMonths: number;
    after5YearsAmount: number;
    resignationFactor: number;
    resignationFactorLabel: string;
  };
};

/**
 * Calculate precise service duration
 * MOJ uses a specific method: count full years, then remaining months, then remaining days
 */
function calculateServiceDuration(start: Date, end: Date): { years: number; months: number; days: number; totalDays: number; totalYearsDecimal: number } {
  // Calculate total days
  const totalMs = Math.max(0, end.getTime() - start.getTime());
  const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  
  // Calculate years, months, days the MOJ way
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  
  // Adjust for negative days
  if (days < 0) {
    months--;
    // Get days in previous month
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }
  
  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Calculate decimal years for precise EOS calculation
  const totalYearsDecimal = years + (months / 12) + (days / 365);
  
  return { years, months, days, totalDays, totalYearsDecimal };
}

/**
 * Calculate EOS entitlement months based on service duration
 * First 5 years: 0.5 month per year
 * After 5 years: 1 month per year
 */
function calculateRawEosMonths(yearsDecimal: number): { rawMonths: number; first5: number; after5: number } {
  const first5Years = Math.min(5, yearsDecimal);
  const after5Years = Math.max(0, yearsDecimal - 5);
  
  const first5Months = first5Years * 0.5;
  const after5Months = after5Years * 1;
  const rawMonths = first5Months + after5Months;
  
  return { rawMonths, first5: first5Months, after5: after5Months };
}

/**
 * Get resignation factor based on years of service (Article 85)
 */
function getResignationFactor(yearsDecimal: number): { factor: number; label: string } {
  if (yearsDecimal < 2) {
    return { factor: 0, label: '0% (< 2 years)' };
  } else if (yearsDecimal < 5) {
    return { factor: 1/3, label: '1/3 (2-5 years)' };
  } else if (yearsDecimal < 10) {
    return { factor: 2/3, label: '2/3 (5-10 years)' };
  } else {
    return { factor: 1, label: '100% (10+ years)' };
  }
}

// Enhanced EOS engine with multiple termination types and documented behavior.
export function calcEOSEngine(args: EosInput): EosResult {
  const { 
    start, end, basic, housingMode, housingPercent, housingFixed, 
    baseType, monthDivisor, leaveDays, separation, extras, deductions,
    otherAllowances = 0
  } = args;
  
  const s = new Date(start);
  const e = new Date(end);
  
  // Calculate duration
  const duration = calculateServiceDuration(s, e);
  
  // Calculate base monthly wage
  const housing = housingMode === 'percent' ? basic * (housingPercent / 100) : housingFixed;
  const baseMonthly = baseType === 'basic' ? basic : basic + housing + otherAllowances;
  const dailyWage = baseMonthly / Math.max(1, monthDivisor);
  
  // Determine which article applies
  const article = ARTICLE_MAPPING[separation] || 'article84';
  
  // Calculate raw EOS
  const { rawMonths, first5, after5 } = calculateRawEosMonths(duration.totalYearsDecimal);
  const rawEOS = rawMonths * baseMonthly;
  
  // Calculate breakdown
  const first5YearsAmount = first5 * baseMonthly;
  const after5YearsAmount = after5 * baseMonthly;
  
  // Determine factor based on article
  let factor = 1;
  let entitlementMonths = rawMonths;
  let resignationFactor = 1;
  let resignationFactorLabel = '100%';
  
  if (article === 'article85') {
    // Article 85: Employee resignation - prorated based on tenure
    const { factor: resFactor, label } = getResignationFactor(duration.totalYearsDecimal);
    resignationFactor = resFactor;
    resignationFactorLabel = label;
    factor = resFactor;
    entitlementMonths = rawMonths * factor;
  } else {
    // Article 84: Full entitlement
    factor = 1;
    entitlementMonths = rawMonths;
  }
  
  // Handle special cases
  if (separation === 'probationEnd' && duration.totalYearsDecimal < 1) {
    // No entitlement during probation
    factor = 0;
    entitlementMonths = 0;
  }

  const entitlementAmount = entitlementMonths * baseMonthly;
  const finalEOS = entitlementAmount;
  const leaveEncash = leaveDays * dailyWage;
  const total = finalEOS + leaveEncash + extras - deductions;

  return {
    duration,
    baseMonthly,
    dailyWage,
    rawMonths,
    rawEOS,
    factor,
    finalEOS,
    leaveEncash,
    extras,
    deductions,
    total,
    terminationType: separation,
    article,
    entitlementMonths,
    entitlementAmount,
    breakdown: {
      first5YearsMonths: first5,
      first5YearsAmount,
      after5YearsMonths: after5,
      after5YearsAmount,
      resignationFactor,
      resignationFactorLabel,
    },
  };
}

export default calcEOSEngine;
