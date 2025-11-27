import calcEOSEngine, { ARTICLE_MAPPING } from './eos/eos.engine';
import type { TerminationType, EosInput, EosResult } from './eos/eos.engine';

// Re-export types and constants
export type { TerminationType, EosInput, EosResult };
export { ARTICLE_MAPPING };

// Backwards-compatible wrapper: older callers pass 'termination'|'resignation'.
export function calcEOS(args: { start: string; end: string; basic: number; housingMode: 'percent'|'fixed'; housingPercent: number; housingFixed: number; baseType: 'basic'|'basic_plus_housing'; monthDivisor: number; leaveDays: number; separation: 'termination'|'resignation'|'employerTermination'|'employeeResignation'|'article84'|'article85'|TerminationType; extras: number; deductions: number; otherAllowances?: number; }) {
  // normalize old values to new TerminationType union
  let sep = args.separation as string;
  if (sep === 'termination') sep = 'article84'; // Old 'termination' = employer termination
  if (sep === 'resignation') sep = 'article85'; // Old 'resignation' = employee resignation
  if (sep === 'employerTermination') sep = 'article84';
  if (sep === 'employeeResignation') sep = 'article85';

  const input: EosInput = {
    start: args.start,
    end: args.end,
    basic: args.basic,
    housingMode: args.housingMode,
    housingPercent: args.housingPercent,
    housingFixed: args.housingFixed,
    baseType: args.baseType,
    monthDivisor: args.monthDivisor,
    leaveDays: args.leaveDays,
    separation: sep as TerminationType,
    extras: args.extras,
    deductions: args.deductions,
    otherAllowances: args.otherAllowances,
  };

  const r = calcEOSEngine(input);
  // Return the same shape as previous implementation plus a few extras
  return {
    duration: r.duration,
    baseMonthly: r.baseMonthly,
    dailyWage: r.dailyWage,
    rawMonths: r.rawMonths,
    rawEOS: r.rawEOS,
    factor: r.factor,
    finalEOS: r.finalEOS,
    leaveEncash: r.leaveEncash,
    extras: r.extras,
    deductions: r.deductions,
    total: r.total,
    // extras for new engine
    terminationType: r.terminationType,
    article: r.article,
    entitlementMonths: r.entitlementMonths,
    entitlementAmount: r.entitlementAmount,
    breakdown: r.breakdown,
  } as const;
}
