import { describe, it, expect } from 'vitest';
import { calcEOS, ARTICLE_MAPPING } from '../eos';

describe('EOS Calculator', () => {
  const defaultArgs = {
    start: '2021-01-01',
    end: '2024-01-01',
    basic: 5000,
    housingMode: 'percent' as const,
    housingPercent: 25,
    housingFixed: 0,
    baseType: 'basic_plus_housing' as const,
    monthDivisor: 30,
    leaveDays: 30,
    separation: 'article85' as const,
    extras: 0,
    deductions: 0,
  };

  it('should calculate 3-year resignation with some entitlement', () => {
    const result = calcEOS(defaultArgs);
    expect(result.total).toBeGreaterThan(0);
    expect(result.finalEOS).toBeDefined();
    expect(result.article).toBe('article85');
  });

  it('should calculate 7-year employer termination with higher entitlement', () => {
    const result = calcEOS({
      ...defaultArgs,
      start: '2017-01-01',
      end: '2024-01-01',
      separation: 'article84' as const,
    });
    expect(result.total).toBeGreaterThan(result.finalEOS || 0);
    expect(result.article).toBe('article84');
  });

  it('should return 0 for resignation before 2 years', () => {
    const result = calcEOS({
      ...defaultArgs,
      start: '2023-06-01',
      end: '2024-01-01',
      separation: 'article85' as const,
    });
    // Under 2 years resignation, entitlement should be 0
    expect(result.finalEOS).toBe(0);
    expect(result.factor).toBe(0);
  });
});

describe('EOS Article Mapping', () => {
  it('should map employerTermination to article84', () => {
    expect(ARTICLE_MAPPING['employerTermination']).toBe('article84');
  });

  it('should map employeeResignation to article85', () => {
    expect(ARTICLE_MAPPING['employeeResignation']).toBe('article85');
  });

  it('should map death, disability, retirement to article84', () => {
    expect(ARTICLE_MAPPING['death']).toBe('article84');
    expect(ARTICLE_MAPPING['disability']).toBe('article84');
    expect(ARTICLE_MAPPING['retirement']).toBe('article84');
  });
});

describe('MOJ Reference Test Cases', () => {
  // MOJ Test Case:
  // Basic: 4500, Allowances: 5500, Total Wage: 10000
  // Start: 2022-11-02, End: 2025-04-10
  // Article 85 (resignation): EOS = 4,069.44, Vacation = 4,333.33
  // Article 84 (termination): EOS = 12,208.33, Vacation = 4,333.33
  
  const mojTestArgs = {
    start: '2022-11-02',
    end: '2025-04-10',
    basic: 10000, // Total wage (basic + housing + allowances combined)
    housingMode: 'fixed' as const,
    housingPercent: 0,
    housingFixed: 0,
    baseType: 'basic' as const, // Use basic only since 10000 is already the total wage
    monthDivisor: 30,
    leaveDays: 13, // Accrued leave days for the period
    extras: 0,
    deductions: 0,
  };

  it('Article 84 (Employer Termination) - should match MOJ EOS = 12,208.33', () => {
    const result = calcEOS({
      ...mojTestArgs,
      separation: 'article84' as const,
    });
    
    // Service: ~2.44 years
    // Raw EOS months = 2.44 * 0.5 = 1.22 months
    // EOS = 1.22 * 10000 = ~12,208.33
    // Allow 0.5% tolerance due to date calculation differences
    expect(result.finalEOS).toBeCloseTo(12208.33, -2); // Within ~100 SAR
    expect(result.article).toBe('article84');
    expect(result.factor).toBe(1); // Full entitlement
  });

  it('Article 85 (Employee Resignation) - should match MOJ EOS = 4,069.44', () => {
    const result = calcEOS({
      ...mojTestArgs,
      separation: 'article85' as const,
    });
    
    // Service: ~2.44 years (between 2-5 years)
    // Raw EOS months = ~1.22 months
    // Factor for 2-5 years = 1/3
    // EOS = 1.22 * 10000 * (1/3) = ~4,069.44
    // Allow 0.5% tolerance due to date calculation differences
    expect(result.finalEOS).toBeCloseTo(4069.44, -2); // Within ~100 SAR
    expect(result.article).toBe('article85');
    expect(result.factor).toBeCloseTo(1/3, 2);
  });

  it('Vacation encashment - should match MOJ Vacation = 4,333.33', () => {
    const result = calcEOS({
      ...mojTestArgs,
      separation: 'article84' as const,
    });
    
    // Leave = 13 days * (10000/30) = 13 * 333.33 = 4,333.33
    expect(result.leaveEncash).toBeCloseTo(4333.33, 0);
  });
});

describe('EOS Resignation Factor by Tenure', () => {
  const baseArgs = {
    basic: 10000,
    housingMode: 'fixed' as const,
    housingPercent: 0,
    housingFixed: 0,
    baseType: 'basic' as const,
    monthDivisor: 30,
    leaveDays: 0,
    separation: 'article85' as const,
    extras: 0,
    deductions: 0,
  };

  it('should give 0% for less than 2 years', () => {
    const result = calcEOS({
      ...baseArgs,
      start: '2023-01-01',
      end: '2024-06-01', // 1.5 years
    });
    expect(result.factor).toBe(0);
    expect(result.finalEOS).toBe(0);
  });

  it('should give 1/3 for 2-5 years', () => {
    const result = calcEOS({
      ...baseArgs,
      start: '2021-01-01',
      end: '2024-01-01', // 3 years
    });
    expect(result.factor).toBeCloseTo(1/3, 2);
  });

  it('should give 2/3 for 5-10 years', () => {
    const result = calcEOS({
      ...baseArgs,
      start: '2017-01-01',
      end: '2024-01-01', // 7 years
    });
    expect(result.factor).toBeCloseTo(2/3, 2);
  });

  it('should give 100% for 10+ years', () => {
    const result = calcEOS({
      ...baseArgs,
      start: '2012-01-01',
      end: '2024-01-01', // 12 years
    });
    expect(result.factor).toBe(1);
  });
});

describe('EOS Breakdown', () => {
  it('should provide breakdown for first 5 years and after', () => {
    const result = calcEOS({
      start: '2017-01-01',
      end: '2024-01-01', // 7 years
      basic: 10000,
      housingMode: 'fixed' as const,
      housingPercent: 0,
      housingFixed: 0,
      baseType: 'basic' as const,
      monthDivisor: 30,
      leaveDays: 0,
      separation: 'article84' as const,
      extras: 0,
      deductions: 0,
    });
    
    expect(result.breakdown).toBeDefined();
    expect(result.breakdown.first5YearsMonths).toBeCloseTo(2.5, 1); // 5 * 0.5
    expect(result.breakdown.after5YearsMonths).toBeCloseTo(2, 1); // 2 * 1
    expect(result.breakdown.first5YearsAmount).toBeCloseTo(25000, 0); // 2.5 * 10000
    expect(result.breakdown.after5YearsAmount).toBeCloseTo(20000, 0); // 2 * 10000
  });
});
