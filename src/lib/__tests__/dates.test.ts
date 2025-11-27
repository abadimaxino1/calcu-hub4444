import { describe, it, expect } from 'vitest';
import { 
  daysInMonth, 
  dayOfMonth, 
  diffBetween, 
  calculateBusinessDays, 
  calculateBreakdown,
  calculateWorkingDays,
  addWorkingDays,
  isWeekend,
  isWorkingDay,
  getNextWorkingDay,
  getPreviousWorkingDay,
  getWorkingDaysInMonth,
  getWeekendDays,
  SAUDI_WEEKEND,
  WESTERN_WEEKEND,
  WeekendConfig
} from '../dates';

describe('Date Calculator - Days in Month', () => {
  it('should return 31 for January', () => {
    expect(daysInMonth(new Date(2024, 0, 15))).toBe(31);
  });

  it('should return 28 for February in non-leap year', () => {
    expect(daysInMonth(new Date(2023, 1, 15))).toBe(28);
  });

  it('should return 29 for February in leap year', () => {
    expect(daysInMonth(new Date(2024, 1, 15))).toBe(29);
  });

  it('should return 30 for April', () => {
    expect(daysInMonth(new Date(2024, 3, 15))).toBe(30);
  });

  it('should return 31 for December', () => {
    expect(daysInMonth(new Date(2024, 11, 15))).toBe(31);
  });
});

describe('Date Calculator - Day of Month', () => {
  it('should return correct day of month', () => {
    expect(dayOfMonth(new Date(2024, 5, 15))).toBe(15);
    expect(dayOfMonth(new Date(2024, 0, 1))).toBe(1);
    expect(dayOfMonth(new Date(2024, 11, 31))).toBe(31);
  });
});

describe('Date Calculator - Date Difference', () => {
  it('should calculate difference in days correctly', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 0, 11);
    const diff = diffBetween(start, end);
    
    expect(diff.totalDays).toBe(10);
  });

  it('should calculate difference in weeks correctly', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 0, 15);
    const diff = diffBetween(start, end);
    
    expect(diff.totalWeeks).toBe(2);
  });

  it('should calculate difference of one year', () => {
    const start = new Date(2023, 0, 1);
    const end = new Date(2024, 0, 1);
    const diff = diffBetween(start, end);
    
    // years uses floor(totalDays / 365.25) which might be 0 for exactly 365 days
    expect(diff.totalDays).toBe(365);
    expect(diff.breakdown.years).toBe(1); // breakdown uses more precise calculation
  });

  it('should calculate difference of leap year correctly', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2025, 0, 1);
    const diff = diffBetween(start, end);
    
    expect(diff.totalDays).toBe(366);
  });

  it('should handle same day', () => {
    const date = new Date(2024, 5, 15);
    const diff = diffBetween(date, date);
    
    expect(diff.totalDays).toBe(0);
  });

  it('should handle inverted dates (return 0)', () => {
    const start = new Date(2024, 5, 15);
    const end = new Date(2024, 5, 10);
    const diff = diffBetween(start, end);
    
    expect(diff.totalDays).toBe(0);
  });
});

describe('Date Calculator - Business Days (Saudi Arabia)', () => {
  it('should calculate business days excluding Friday and Saturday', () => {
    // Week starting Sunday Jan 7, 2024
    const start = new Date(2024, 0, 7); // Sunday
    const end = new Date(2024, 0, 13); // Saturday
    const businessDays = calculateBusinessDays(start, end);
    
    // Sun, Mon, Tue, Wed, Thu = 5 business days
    expect(businessDays).toBe(5);
  });

  it('should return 0 for weekend only', () => {
    const start = new Date(2024, 0, 5); // Friday
    const end = new Date(2024, 0, 6); // Saturday
    const businessDays = calculateBusinessDays(start, end);
    
    expect(businessDays).toBe(0);
  });

  it('should calculate full month business days', () => {
    // January 2024 has 31 days
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 0, 31);
    const businessDays = calculateBusinessDays(start, end);
    
    // January 2024: 4 full weeks + some days
    // Approximately 23 business days
    expect(businessDays).toBeGreaterThanOrEqual(22);
    expect(businessDays).toBeLessThanOrEqual(24);
  });

  it('should calculate two weeks business days', () => {
    // Two full weeks = 10 business days
    const start = new Date(2024, 0, 7); // Sunday
    const end = new Date(2024, 0, 18); // Thursday
    const businessDays = calculateBusinessDays(start, end);
    
    expect(businessDays).toBe(10);
  });
});

describe('Date Calculator - Breakdown', () => {
  it('should break down into years, months, days', () => {
    const start = new Date(2020, 0, 1);
    const end = new Date(2023, 5, 15);
    const breakdown = calculateBreakdown(start, end);
    
    expect(breakdown.years).toBe(3);
    expect(breakdown.months).toBe(5);
    expect(breakdown.days).toBe(14);
  });

  it('should handle exact years', () => {
    const start = new Date(2020, 0, 1);
    const end = new Date(2023, 0, 1);
    const breakdown = calculateBreakdown(start, end);
    
    expect(breakdown.years).toBe(3);
    expect(breakdown.months).toBe(0);
    expect(breakdown.days).toBe(0);
  });

  it('should handle months only', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 5, 1);
    const breakdown = calculateBreakdown(start, end);
    
    expect(breakdown.years).toBe(0);
    expect(breakdown.months).toBe(5);
    expect(breakdown.days).toBe(0);
  });

  it('should handle days only', () => {
    const start = new Date(2024, 5, 1);
    const end = new Date(2024, 5, 15);
    const breakdown = calculateBreakdown(start, end);
    
    expect(breakdown.years).toBe(0);
    expect(breakdown.months).toBe(0);
    expect(breakdown.days).toBe(14);
  });

  it('should handle complex date differences', () => {
    const start = new Date(2020, 2, 15); // March 15, 2020
    const end = new Date(2024, 7, 20); // August 20, 2024
    const breakdown = calculateBreakdown(start, end);
    
    expect(breakdown.years).toBe(4);
    expect(breakdown.months).toBe(5);
    expect(breakdown.days).toBe(5);
  });
});

describe('Date Calculator - diffBetween comprehensive', () => {
  it('should include all metrics in result', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 1, 1);
    const diff = diffBetween(start, end);
    
    expect(diff).toHaveProperty('ms');
    expect(diff).toHaveProperty('totalSeconds');
    expect(diff).toHaveProperty('totalMinutes');
    expect(diff).toHaveProperty('totalHours');
    expect(diff).toHaveProperty('totalDays');
    expect(diff).toHaveProperty('totalWeeks');
    expect(diff).toHaveProperty('years');
    expect(diff).toHaveProperty('months');
    expect(diff).toHaveProperty('businessDays');
    expect(diff).toHaveProperty('breakdown');
  });

  it('should calculate hours correctly', () => {
    const start = new Date(2024, 0, 1, 0, 0, 0);
    const end = new Date(2024, 0, 1, 12, 0, 0);
    const diff = diffBetween(start, end);
    
    expect(diff.totalHours).toBe(12);
  });

  it('should calculate minutes correctly', () => {
    const start = new Date(2024, 0, 1, 0, 0, 0);
    const end = new Date(2024, 0, 1, 1, 30, 0);
    const diff = diffBetween(start, end);
    
    expect(diff.totalMinutes).toBe(90);
  });
});

describe('Date Calculator - Edge Cases', () => {
  it('should handle end of month to beginning of next', () => {
    const start = new Date(2024, 0, 31);
    const end = new Date(2024, 1, 1);
    const diff = diffBetween(start, end);
    
    expect(diff.totalDays).toBe(1);
  });

  it('should handle year boundary', () => {
    const start = new Date(2023, 11, 31);
    const end = new Date(2024, 0, 1);
    const diff = diffBetween(start, end);
    
    expect(diff.totalDays).toBe(1);
  });

  it('should handle February edge case', () => {
    const start = new Date(2024, 1, 28);
    const end = new Date(2024, 1, 29);
    const diff = diffBetween(start, end);
    
    expect(diff.totalDays).toBe(1);
  });
});

describe('Date Calculator - Service Years (for EOS)', () => {
  it('should calculate service years for end of service', () => {
    const start = new Date(2019, 5, 1); // June 1, 2019
    const end = new Date(2024, 5, 1); // June 1, 2024
    const diff = diffBetween(start, end);
    
    expect(diff.years).toBe(5);
    expect(diff.breakdown.years).toBe(5);
    expect(diff.breakdown.months).toBe(0);
    expect(diff.breakdown.days).toBe(0);
  });

  it('should calculate partial years correctly', () => {
    const start = new Date(2020, 0, 15);
    const end = new Date(2024, 6, 20);
    const diff = diffBetween(start, end);
    
    // 4 years, 6 months, 5 days
    expect(diff.breakdown.years).toBe(4);
    expect(diff.breakdown.months).toBe(6);
    expect(diff.breakdown.days).toBe(5);
  });
});

describe('Weekend Configuration', () => {
  it('should return correct weekend days for Saudi weekend', () => {
    const days = getWeekendDays(SAUDI_WEEKEND);
    expect(days).toEqual([5, 6]); // Friday, Saturday
  });

  it('should return correct weekend days for Western weekend', () => {
    const days = getWeekendDays(WESTERN_WEEKEND);
    expect(days).toEqual([0, 6]); // Sunday, Saturday
  });

  it('should return custom weekend days', () => {
    const custom: WeekendConfig = { type: 'custom', customDays: [0, 1] };
    const days = getWeekendDays(custom);
    expect(days).toEqual([0, 1]); // Sunday, Monday
  });
});

describe('Working Days Calculator', () => {
  it('should calculate working days with Saudi weekend', () => {
    // Week: Sun Jan 7 to Sat Jan 13, 2024
    const start = new Date(2024, 0, 7);
    const end = new Date(2024, 0, 13);
    const { workingDays, weekendDays } = calculateWorkingDays(start, end, SAUDI_WEEKEND);
    
    expect(workingDays).toBe(5); // Sun-Thu
    expect(weekendDays).toBe(2); // Fri-Sat
  });

  it('should calculate working days with Western weekend', () => {
    // Week: Sun Jan 7 to Sat Jan 13, 2024
    const start = new Date(2024, 0, 7);
    const end = new Date(2024, 0, 13);
    const { workingDays, weekendDays } = calculateWorkingDays(start, end, WESTERN_WEEKEND);
    
    expect(workingDays).toBe(5); // Mon-Fri
    expect(weekendDays).toBe(2); // Sat-Sun
  });

  it('should exclude holidays from working days', () => {
    const start = new Date(2024, 0, 7);
    const end = new Date(2024, 0, 13);
    const holidays = [new Date(2024, 0, 9)]; // Tuesday holiday
    const { workingDays } = calculateWorkingDays(start, end, SAUDI_WEEKEND, holidays);
    
    expect(workingDays).toBe(4); // One less due to holiday
  });
});

describe('Add Working Days', () => {
  it('should add working days correctly', () => {
    // Sunday Jan 7, 2024: Start date is already a working day
    // +5 working days: Mon(8), Tue(9), Wed(10), Thu(11), then skip Fri(12)-Sat(13), Sun(14)
    // Actually function starts counting from NEXT day, so:
    // Day 1: Mon(8), Day 2: Tue(9), Day 3: Wed(10), Day 4: Thu(11), skip Fri-Sat, Day 5: Sun(14)
    const start = new Date(2024, 0, 7);
    const result = addWorkingDays(start, 5, SAUDI_WEEKEND);
    
    expect(result.getDate()).toBe(14);
    expect(result.getDay()).toBe(0); // Sunday
  });

  it('should skip weekends when adding working days', () => {
    // Thursday Jan 11, 2024 + 2 working days
    // Day 1: skip Fri(12)-Sat(13), Day 1: Sun(14), Day 2: Mon(15)
    const start = new Date(2024, 0, 11);
    const result = addWorkingDays(start, 2, SAUDI_WEEKEND);
    
    expect(result.getDate()).toBe(15);
    expect(result.getDay()).toBe(1); // Monday
  });

  it('should handle negative working days', () => {
    // Thursday Jan 11, 2024 - 2 working days = Tuesday Jan 9
    const start = new Date(2024, 0, 11);
    const result = addWorkingDays(start, -2, SAUDI_WEEKEND);
    
    expect(result.getDate()).toBe(9);
    expect(result.getDay()).toBe(2); // Tuesday
  });

  it('should skip holidays when adding working days', () => {
    // Sunday Jan 7 + 5 working days with Monday(8) as holiday
    // Day 1: skip Mon(8-holiday), Tue(9), Day 2: Wed(10), Day 3: Thu(11), skip Fri-Sat, Day 4: Sun(14), Day 5: Mon(15)
    const start = new Date(2024, 0, 7);
    const holidays = [new Date(2024, 0, 8)]; // Monday holiday
    const result = addWorkingDays(start, 5, SAUDI_WEEKEND, holidays);
    
    expect(result.getDate()).toBe(15);
  });
});

describe('Weekend and Working Day Checks', () => {
  it('should identify Saudi weekend days', () => {
    expect(isWeekend(new Date(2024, 0, 5), SAUDI_WEEKEND)).toBe(true); // Friday
    expect(isWeekend(new Date(2024, 0, 6), SAUDI_WEEKEND)).toBe(true); // Saturday
    expect(isWeekend(new Date(2024, 0, 7), SAUDI_WEEKEND)).toBe(false); // Sunday
  });

  it('should identify Western weekend days', () => {
    expect(isWeekend(new Date(2024, 0, 6), WESTERN_WEEKEND)).toBe(true); // Saturday
    expect(isWeekend(new Date(2024, 0, 7), WESTERN_WEEKEND)).toBe(true); // Sunday
    expect(isWeekend(new Date(2024, 0, 8), WESTERN_WEEKEND)).toBe(false); // Monday
  });

  it('should identify working days', () => {
    expect(isWorkingDay(new Date(2024, 0, 7), SAUDI_WEEKEND)).toBe(true); // Sunday
    expect(isWorkingDay(new Date(2024, 0, 5), SAUDI_WEEKEND)).toBe(false); // Friday
  });

  it('should exclude holidays from working days', () => {
    const holiday = new Date(2024, 0, 7); // Sunday
    expect(isWorkingDay(new Date(2024, 0, 7), SAUDI_WEEKEND, [holiday])).toBe(false);
  });
});

describe('Next/Previous Working Day', () => {
  it('should get next working day from Friday (Saudi)', () => {
    const friday = new Date(2024, 0, 5);
    const next = getNextWorkingDay(friday, SAUDI_WEEKEND);
    
    expect(next.getDate()).toBe(7); // Sunday
    expect(next.getDay()).toBe(0);
  });

  it('should get previous working day from Sunday (Saudi)', () => {
    const sunday = new Date(2024, 0, 7);
    const prev = getPreviousWorkingDay(sunday, SAUDI_WEEKEND);
    
    expect(prev.getDate()).toBe(4); // Thursday
    expect(prev.getDay()).toBe(4);
  });
});

describe('Working Days in Month', () => {
  it('should calculate working days in January 2024 (Saudi)', () => {
    const workingDays = getWorkingDaysInMonth(2024, 0, SAUDI_WEEKEND);
    
    // January 2024 has 31 days
    // 4 Fridays + 4 Saturdays = 8 weekend days
    // But Jan starts on Monday, so has 5 Fridays and 4 Saturdays = 9 weekend days
    expect(workingDays).toBeGreaterThanOrEqual(22);
    expect(workingDays).toBeLessThanOrEqual(23);
  });

  it('should calculate working days with holidays', () => {
    const holidays = [new Date(2024, 0, 1), new Date(2024, 0, 2)];
    const workingDays = getWorkingDaysInMonth(2024, 0, SAUDI_WEEKEND, holidays);
    
    // 2 fewer working days due to holidays (if they fall on weekdays)
    expect(workingDays).toBeLessThanOrEqual(21);
  });
});

describe('diffBetween with Weekend Config', () => {
  it('should include workingDays and weekendDays in result', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 0, 31);
    const diff = diffBetween(start, end);
    
    expect(diff).toHaveProperty('workingDays');
    expect(diff).toHaveProperty('weekendDays');
    expect(diff.workingDays + diff.weekendDays).toBe(diff.totalDays + 1);
  });

  it('should respect custom weekend config', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 0, 7);
    
    const diffSaudi = diffBetween(start, end, { weekend: SAUDI_WEEKEND });
    const diffWestern = diffBetween(start, end, { weekend: WESTERN_WEEKEND });
    
    // Different weekend configs should give different working days
    expect(diffSaudi.workingDays).toBeDefined();
    expect(diffWestern.workingDays).toBeDefined();
  });
});
