import { describe, it, expect } from 'vitest';
import { calcPayroll, calculateHourlyRate, calculateOvertime, GOSI_CAP, OVERTIME_MULTIPLIER, PayrollInput, GOSI_PROFILES, GosiProfile, getGosiRates, calcContributoryWage } from '../payroll';

// Helper to create default payroll input
function createPayrollInput(overrides: Partial<PayrollInput> = {}): PayrollInput {
  return {
    mode: 'gross2net',
    resident: 'saudi',
    basic: 5000,
    housingMode: 'percent',
    housingPercent: 25,
    housingFixed: 0,
    transport: 500,
    otherAllow: 0,
    insEmpPct: 9.75,
    insErPct: 11.75,
    insBase: 'gosi',
    otherDedPct: 0,
    flatDed: 0,
    monthDivisor: 30,
    hoursPerDay: 8,
    prorateToDate: false,
    assumedBasicForN2G: 5000,
    grossOverride: null,
    ...overrides,
  };
}

describe('Salary Calculator - Gross to Net', () => {
  it('should calculate basic Saudi employee salary correctly', () => {
    const input = createPayrollInput({
      basic: 10000,
      housingMode: 'percent',
      housingPercent: 25,
      transport: 0,
      otherAllow: 0,
    });
    
    const result = calcPayroll(input);
    
    // Gross = 10000 + 2500 (housing 25%) = 12500
    expect(result.monthly.gross).toBe(12500);
    
    // GOSI base = basic + housing = 12500 (under cap)
    // Employee GOSI = 12500 * 9.75% = 1218.75
    expect(result.monthly.insuranceEmployee).toBeCloseTo(1218.75, 2);
    
    // Net = 12500 - 1218.75 = 11281.25
    expect(result.monthly.net).toBeCloseTo(11281.25, 2);
    
    // Yearly calculations
    expect(result.yearly.gross).toBe(12500 * 12);
    expect(result.yearly.net).toBeCloseTo(11281.25 * 12, 0);
  });

  it('should apply GOSI cap for high salaries', () => {
    const input = createPayrollInput({
      basic: 50000,
      housingMode: 'percent',
      housingPercent: 25,
      transport: 0,
      otherAllow: 0,
    });
    
    const result = calcPayroll(input);
    
    // Gross = 50000 + 12500 = 62500
    expect(result.monthly.gross).toBe(62500);
    
    // GOSI base should be capped at 45000
    // Employee GOSI = 45000 * 9.75% = 4387.50
    expect(result.monthly.insuranceEmployee).toBeCloseTo(4387.50, 2);
  });

  it('should not deduct GOSI for non-Saudi employees', () => {
    const input = createPayrollInput({
      basic: 10000,
      resident: 'expat',
    });
    
    const result = calcPayroll(input);
    
    // Non-Saudi employee has no GOSI deduction
    expect(result.monthly.insuranceEmployee).toBe(0);
    
    // Net should equal gross for non-Saudi (no other deductions)
    expect(result.monthly.net).toBe(result.monthly.gross);
  });

  it('should calculate with fixed housing allowance', () => {
    const input = createPayrollInput({
      basic: 8000,
      housingMode: 'fixed',
      housingFixed: 2000,
      transport: 500,
      otherAllow: 300,
    });
    
    const result = calcPayroll(input);
    
    // Gross = 8000 + 2000 + 500 + 300 = 10800
    expect(result.monthly.gross).toBe(10800);
    
    // GOSI base = basic + housing = 10000
    // Employee GOSI = 10000 * 9.75% = 975
    expect(result.monthly.insuranceEmployee).toBeCloseTo(975, 2);
  });

  it('should calculate with all allowances', () => {
    const input = createPayrollInput({
      basic: 7000,
      housingMode: 'percent',
      housingPercent: 25,
      transport: 800,
      otherAllow: 500,
    });
    
    const result = calcPayroll(input);
    
    // Housing = 7000 * 25% = 1750
    // Gross = 7000 + 1750 + 800 + 500 = 10050
    expect(result.monthly.gross).toBe(10050);
  });

  it('should handle additional percentage deductions', () => {
    const input = createPayrollInput({
      basic: 10000,
      housingMode: 'percent',
      housingPercent: 25,
      transport: 500, // default transport
      otherDedPct: 2, // 2% additional deduction
    });
    
    const result = calcPayroll(input);
    
    // Gross = 10000 + 2500 + 500 = 13000
    // Other % deduction = 13000 * 2% = 260
    expect(result.monthly.otherPctAmt).toBeCloseTo(260, 2);
  });

  it('should handle flat deductions', () => {
    const input = createPayrollInput({
      basic: 10000,
      flatDed: 500,
    });
    
    const result = calcPayroll(input);
    
    // Flat deduction should be subtracted
    expect(result.monthly.flat).toBe(500);
    
    // Net should reflect flat deduction
    const expectedNet = result.monthly.gross - result.monthly.insuranceEmployee - 500;
    expect(result.monthly.net).toBeCloseTo(expectedNet, 2);
  });
});

describe('Salary Calculator - Net to Gross', () => {
  it('should calculate gross from desired net salary', () => {
    const input = createPayrollInput({
      mode: 'net2gross',
      basic: 10000, // This is the target net
      assumedBasicForN2G: 8000,
    });
    
    const result = calcPayroll(input);
    
    // The calculated gross should produce approximately the target net
    // We can verify by recalculating
    const reverseInput = createPayrollInput({
      mode: 'gross2net',
      basic: result.monthly.gross * 0.8, // Approximate basic from gross
      grossOverride: result.monthly.gross,
    });
    
    const reverseResult = calcPayroll(reverseInput);
    // Net should be close to original target
    expect(reverseResult.monthly.net).toBeGreaterThan(9000);
  });
});

describe('Salary Calculator - Overtime', () => {
  it('should calculate overtime correctly', () => {
    const input = createPayrollInput({
      basic: 6000,
      housingMode: 'percent',
      housingPercent: 25,
      transport: 500,
      overtime: {
        enabled: true,
        hours: 10,
      },
    });
    
    const result = calcPayroll(input);
    
    // Gross = 6000 + 1500 + 500 = 8000
    expect(result.monthly.gross).toBe(8000);
    
    // Hourly rate = 8000 / 30 / 8 = 33.33
    expect(result.hourly.gross).toBeCloseTo(33.33, 1);
    
    // Overtime rate = 33.33 * 1.5 = 50
    expect(result.hourly.overtimeRate).toBeCloseTo(50, 0);
    
    // Overtime amount = 50 * 10 = 500
    expect(result.monthly.overtime).toBeCloseTo(500, 0);
    
    // Gross with overtime
    expect(result.monthly.grossWithOvertime).toBeCloseTo(8500, 0);
  });

  it('should use custom overtime multiplier', () => {
    const input = createPayrollInput({
      basic: 6000,
      overtime: {
        enabled: true,
        hours: 5,
        rate: 2.0, // Double time
      },
    });
    
    const result = calcPayroll(input);
    
    // With rate 2.0, overtime should be calculated at double
    expect(result.hourly.overtimeRate).toBeGreaterThan(result.hourly.gross);
  });

  it('should not calculate overtime when disabled', () => {
    const input = createPayrollInput({
      basic: 6000,
      overtime: {
        enabled: false,
        hours: 10,
      },
    });
    
    const result = calcPayroll(input);
    
    expect(result.monthly.overtime).toBe(0);
  });
});

describe('Salary Calculator - Hourly Rate', () => {
  it('should calculate hourly rate correctly', () => {
    const hourlyRate = calculateHourlyRate(9000, 30, 8);
    
    // 9000 / 30 / 8 = 37.5
    expect(hourlyRate).toBeCloseTo(37.5, 2);
  });

  it('should calculate overtime pay correctly', () => {
    const overtime = calculateOvertime(37.5, 10, 1.5);
    
    expect(overtime.rate).toBeCloseTo(56.25, 2); // 37.5 * 1.5
    expect(overtime.amount).toBeCloseTo(562.5, 1); // 56.25 * 10
  });
});

describe('Salary Calculator - Daily and Hourly Breakdown', () => {
  it('should calculate daily rates correctly', () => {
    const input = createPayrollInput({
      basic: 9000,
      housingMode: 'fixed',
      housingFixed: 0,
      transport: 0,
      monthDivisor: 30,
    });
    
    const result = calcPayroll(input);
    
    // Daily gross = 9000 / 30 = 300
    expect(result.daily.gross).toBeCloseTo(300, 2);
    
    // Hourly gross = 300 / 8 = 37.5
    expect(result.hourly.gross).toBeCloseTo(37.5, 2);
  });
});

describe('Salary Calculator - Realistic Saudi Examples', () => {
  it('Example 1: Entry-level Saudi employee', () => {
    const input = createPayrollInput({
      basic: 4000,
      housingMode: 'percent',
      housingPercent: 25,
      transport: 500,
      resident: 'saudi',
    });
    
    const result = calcPayroll(input);
    
    // Gross = 4000 + 1000 + 500 = 5500
    expect(result.monthly.gross).toBe(5500);
    
    // GOSI = 5000 * 9.75% = 487.50
    expect(result.monthly.insuranceEmployee).toBeCloseTo(487.5, 2);
    
    // Net = 5500 - 487.5 = 5012.50
    expect(result.monthly.net).toBeCloseTo(5012.5, 2);
  });

  it('Example 2: Mid-level expat employee', () => {
    const input = createPayrollInput({
      basic: 12000,
      housingMode: 'fixed',
      housingFixed: 3000,
      transport: 1000,
      resident: 'expat',
    });
    
    const result = calcPayroll(input);
    
    // Gross = 12000 + 3000 + 1000 = 16000
    expect(result.monthly.gross).toBe(16000);
    
    // No GOSI for expat
    expect(result.monthly.insuranceEmployee).toBe(0);
    
    // Net = Gross for expat
    expect(result.monthly.net).toBe(16000);
  });

  it('Example 3: Senior Saudi employee with high salary', () => {
    const input = createPayrollInput({
      basic: 40000,
      housingMode: 'percent',
      housingPercent: 25,
      transport: 2000,
      otherAllow: 3000,
      resident: 'saudi',
    });
    
    const result = calcPayroll(input);
    
    // Housing = 40000 * 25% = 10000
    // Gross = 40000 + 10000 + 2000 + 3000 = 55000
    expect(result.monthly.gross).toBe(55000);
    
    // GOSI base capped at 45000
    // Employee GOSI = 45000 * 9.75% = 4387.50
    expect(result.monthly.insuranceEmployee).toBeCloseTo(4387.5, 2);
    
    // Employer GOSI = 45000 * 11.75% = 5287.50
    expect(result.monthly.insuranceEmployer).toBeCloseTo(5287.5, 2);
  });
});

describe('GOSI Profile System', () => {
  it('should have correct rates for saudi-standard profile', () => {
    const rates = getGosiRates('saudi-standard');
    expect(rates.empPct).toBe(10);
    expect(rates.erPct).toBe(12);
  });

  it('should have correct rates for saudi-legacy profile', () => {
    const rates = getGosiRates('saudi-legacy');
    expect(rates.empPct).toBe(9.75);
    expect(rates.erPct).toBe(11.75);
  });

  it('should have correct rates for non-saudi profile', () => {
    const rates = getGosiRates('non-saudi');
    expect(rates.empPct).toBe(0);
    expect(rates.erPct).toBe(2);
  });

  it('should use custom rates for custom profile', () => {
    const rates = getGosiRates('custom', 5, 8);
    expect(rates.empPct).toBe(5);
    expect(rates.erPct).toBe(8);
  });

  it('should calculate contributory wage correctly', () => {
    // Under cap
    expect(calcContributoryWage(10000, 2500)).toBe(12500);
    
    // At cap
    expect(calcContributoryWage(36000, 9000)).toBe(GOSI_CAP);
    
    // Over cap
    expect(calcContributoryWage(50000, 12500)).toBe(GOSI_CAP);
  });
});

describe('Salary Calculator - GOSI Profiles', () => {
  it('should calculate with saudi-standard profile (10%)', () => {
    const input = createPayrollInput({
      basic: 10000,
      housingMode: 'percent',
      housingPercent: 25,
      transport: 0,
      otherAllow: 0,
      gosiProfile: 'saudi-standard',
    });
    
    const result = calcPayroll(input);
    
    // Gross = 10000 + 2500 = 12500
    expect(result.monthly.gross).toBe(12500);
    
    // GOSI base = 12500 (under cap)
    // Employee GOSI = 12500 * 10% = 1250
    expect(result.monthly.insuranceEmployee).toBeCloseTo(1250, 2);
    
    // Employer GOSI = 12500 * 12% = 1500
    expect(result.monthly.insuranceEmployer).toBeCloseTo(1500, 2);
    
    // Net = 12500 - 1250 = 11250
    expect(result.monthly.net).toBeCloseTo(11250, 2);
  });

  it('should calculate with saudi-legacy profile (9.75%)', () => {
    const input = createPayrollInput({
      basic: 10000,
      housingMode: 'percent',
      housingPercent: 25,
      transport: 0,
      otherAllow: 0,
      gosiProfile: 'saudi-legacy',
    });
    
    const result = calcPayroll(input);
    
    // GOSI base = 12500
    // Employee GOSI = 12500 * 9.75% = 1218.75
    expect(result.monthly.insuranceEmployee).toBeCloseTo(1218.75, 2);
    
    // Employer GOSI = 12500 * 11.75% = 1468.75
    expect(result.monthly.insuranceEmployer).toBeCloseTo(1468.75, 2);
  });

  it('should calculate with non-saudi profile (0%)', () => {
    const input = createPayrollInput({
      basic: 10000,
      housingMode: 'percent',
      housingPercent: 25,
      transport: 0,
      otherAllow: 0,
      gosiProfile: 'non-saudi',
    });
    
    const result = calcPayroll(input);
    
    // Employee GOSI = 0 for non-Saudi
    expect(result.monthly.insuranceEmployee).toBe(0);
    
    // Employer GOSI = 12500 * 2% = 250 (occupational hazards)
    expect(result.monthly.insuranceEmployer).toBeCloseTo(250, 2);
    
    // Net = Gross (no employee deduction)
    expect(result.monthly.net).toBe(result.monthly.gross);
  });

  it('should calculate with custom profile', () => {
    const input = createPayrollInput({
      basic: 10000,
      housingMode: 'percent',
      housingPercent: 25,
      transport: 0,
      otherAllow: 0,
      gosiProfile: 'custom',
      insEmpPct: 5,
      insErPct: 8,
    });
    
    const result = calcPayroll(input);
    
    // GOSI base = 12500
    // Employee GOSI = 12500 * 5% = 625
    expect(result.monthly.insuranceEmployee).toBeCloseTo(625, 2);
    
    // Employer GOSI = 12500 * 8% = 1000
    expect(result.monthly.insuranceEmployer).toBeCloseTo(1000, 2);
  });

  it('gosiProfile should take precedence over resident field', () => {
    const input = createPayrollInput({
      basic: 10000,
      housingMode: 'percent',
      housingPercent: 25,
      transport: 0,
      otherAllow: 0,
      resident: 'saudi', // Would normally use legacy rates
      gosiProfile: 'saudi-standard', // Should use standard 10%
    });
    
    const result = calcPayroll(input);
    
    // Should use gosiProfile rate (10%), not resident rate (9.75%)
    // Employee GOSI = 12500 * 10% = 1250
    expect(result.monthly.insuranceEmployee).toBeCloseTo(1250, 2);
  });

  it('should fallback to resident field when gosiProfile not set', () => {
    const inputSaudi = createPayrollInput({
      basic: 10000,
      housingMode: 'percent',
      housingPercent: 25,
      transport: 0,
      resident: 'saudi',
      // gosiProfile not set - should use insEmpPct/insErPct
    });
    
    const inputExpat = createPayrollInput({
      basic: 10000,
      housingMode: 'percent',
      housingPercent: 25,
      transport: 0,
      resident: 'expat',
      // gosiProfile not set - should have 0% employee
    });
    
    const resultSaudi = calcPayroll(inputSaudi);
    const resultExpat = calcPayroll(inputExpat);
    
    // Saudi should have deduction
    expect(resultSaudi.monthly.insuranceEmployee).toBeGreaterThan(0);
    
    // Expat should have no employee deduction
    expect(resultExpat.monthly.insuranceEmployee).toBe(0);
  });
});

describe('GOSI Cap with Different Profiles', () => {
  it('should apply GOSI cap with saudi-standard profile', () => {
    const input = createPayrollInput({
      basic: 50000,
      housingMode: 'percent',
      housingPercent: 25,
      gosiProfile: 'saudi-standard',
    });
    
    const result = calcPayroll(input);
    
    // GOSI capped at 45000
    // Employee GOSI = 45000 * 10% = 4500
    expect(result.monthly.insuranceEmployee).toBeCloseTo(4500, 2);
    
    // Employer GOSI = 45000 * 12% = 5400
    expect(result.monthly.insuranceEmployer).toBeCloseTo(5400, 2);
  });
});
