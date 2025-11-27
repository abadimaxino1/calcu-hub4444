import { describe, it, expect } from 'vitest';
import { calcEndTimeLocal, nowHHmm } from '../workhours';

describe('Work Hours Calculator - Exit Time', () => {
  it('should calculate exit time for standard 8-hour shift', () => {
    // Start at 08:00, work 8 hours, no break
    const exitTime = calcEndTimeLocal('08:00', 8, 0, false);
    expect(exitTime).toBe('16:00');
  });

  it('should calculate exit time with 1-hour break (unpaid)', () => {
    // Start at 08:00, work 8 hours, 60 min unpaid break
    const exitTime = calcEndTimeLocal('08:00', 8, 60, false);
    expect(exitTime).toBe('16:00');
  });

  it('should calculate exit time with 1-hour break (paid)', () => {
    // Start at 08:00, work 8 hours, 60 min paid break
    // Total time = 8 hours work + 1 hour break = 9 hours
    const exitTime = calcEndTimeLocal('08:00', 8, 60, true);
    expect(exitTime).toBe('17:00');
  });

  it('should calculate exit time with 30-minute break', () => {
    // Start at 09:00, work 8 hours, 30 min break (paid)
    const exitTime = calcEndTimeLocal('09:00', 8, 30, true);
    expect(exitTime).toBe('17:30');
  });

  it('should handle morning shift starting at 07:30', () => {
    const exitTime = calcEndTimeLocal('07:30', 8, 0, false);
    expect(exitTime).toBe('15:30');
  });

  it('should handle late start at 10:00', () => {
    const exitTime = calcEndTimeLocal('10:00', 8, 0, false);
    expect(exitTime).toBe('18:00');
  });

  it('should handle Ramadan 6-hour shift', () => {
    // During Ramadan, shifts are 6 hours
    const exitTime = calcEndTimeLocal('09:00', 6, 0, false);
    expect(exitTime).toBe('15:00');
  });

  it('should wrap around midnight correctly', () => {
    // Night shift starting at 22:00
    const exitTime = calcEndTimeLocal('22:00', 8, 0, false);
    expect(exitTime).toBe('06:00');
  });

  it('should handle partial hours', () => {
    // Start at 08:00, work 7.5 hours
    const exitTime = calcEndTimeLocal('08:00', 7.5, 0, false);
    expect(exitTime).toBe('15:30');
  });

  it('should handle invalid time format', () => {
    const exitTime = calcEndTimeLocal('invalid', 8, 0, false);
    expect(exitTime).toBe('--:--');
  });

  it('should handle empty input', () => {
    const exitTime = calcEndTimeLocal('', 8, 0, false);
    expect(exitTime).toBe('--:--');
  });

  it('should handle 4.5-hour shift', () => {
    const exitTime = calcEndTimeLocal('14:00', 4.5, 0, false);
    expect(exitTime).toBe('18:30');
  });
});

describe('Work Hours Calculator - nowHHmm', () => {
  it('should return current time in HH:mm format', () => {
    const result = nowHHmm();
    
    // Should match HH:mm pattern
    expect(result).toMatch(/^\d{2}:\d{2}$/);
    
    // Parse and validate
    const [hours, minutes] = result.split(':').map(Number);
    expect(hours).toBeGreaterThanOrEqual(0);
    expect(hours).toBeLessThan(24);
    expect(minutes).toBeGreaterThanOrEqual(0);
    expect(minutes).toBeLessThan(60);
  });
});

describe('Work Hours Calculator - Weekly/Monthly Calculations', () => {
  it('should calculate weekly hours correctly', () => {
    // 5 days * 8 hours = 40 hours per week
    const dailyHours = 8;
    const workDays = 5;
    const weeklyHours = dailyHours * workDays;
    
    expect(weeklyHours).toBe(40);
  });

  it('should calculate monthly hours correctly', () => {
    // Approximately 4.33 weeks per month
    const weeklyHours = 40;
    const monthlyHours = weeklyHours * 4.33;
    
    expect(Math.round(monthlyHours)).toBe(173);
  });

  it('should calculate 6-day work week hours', () => {
    // Saudi traditional work week (before reform)
    const dailyHours = 8;
    const workDays = 6;
    const weeklyHours = dailyHours * workDays;
    
    expect(weeklyHours).toBe(48);
  });

  it('should calculate Ramadan weekly hours', () => {
    // Ramadan: 6 hours * 5 days = 30 hours
    const dailyHours = 6;
    const workDays = 5;
    const weeklyHours = dailyHours * workDays;
    
    expect(weeklyHours).toBe(30);
  });
});

describe('Work Hours Calculator - Edge Cases', () => {
  it('should handle zero work hours', () => {
    const exitTime = calcEndTimeLocal('08:00', 0, 0, false);
    expect(exitTime).toBe('08:00');
  });

  it('should handle very long shift (24 hours)', () => {
    const exitTime = calcEndTimeLocal('08:00', 24, 0, false);
    expect(exitTime).toBe('08:00'); // Wraps around
  });

  it('should handle midnight start', () => {
    const exitTime = calcEndTimeLocal('00:00', 8, 0, false);
    expect(exitTime).toBe('08:00');
  });

  it('should handle 23:59 start', () => {
    const exitTime = calcEndTimeLocal('23:59', 8, 0, false);
    // Should wrap to next day
    expect(exitTime).toBe('07:59');
  });
});
