// Import Hijri converter if available
// Note: Using dynamic import for optional hijri support
let HijriDate: any = null;
try {
  HijriDate = require('hijri-converter');
} catch (e) {
  // Hijri converter not available, will use fallback
}

export function daysInMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function dayOfMonth(d = new Date()) {
  return d.getDate();
}

// Weekend configuration
export type WeekendType = 'fri-sat' | 'sat-sun' | 'fri' | 'sat' | 'sun' | 'custom';

export interface WeekendConfig {
  type: WeekendType;
  customDays?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
}

// Default Saudi weekend (Friday-Saturday)
export const SAUDI_WEEKEND: WeekendConfig = { type: 'fri-sat' };
// Western weekend (Saturday-Sunday)
export const WESTERN_WEEKEND: WeekendConfig = { type: 'sat-sun' };

// Get weekend days as array of day numbers
export function getWeekendDays(config: WeekendConfig = SAUDI_WEEKEND): number[] {
  switch (config.type) {
    case 'fri-sat': return [5, 6]; // Friday=5, Saturday=6
    case 'sat-sun': return [0, 6]; // Sunday=0, Saturday=6
    case 'fri': return [5];
    case 'sat': return [6];
    case 'sun': return [0];
    case 'custom': return config.customDays || [];
    default: return [5, 6];
  }
}

// Date calculation mode
export type DateCalcMode = 'calendar' | 'working';

export interface DateDiff {
  ms: number;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  totalDays: number;
  totalWeeks: number;
  years: number;
  months: number;
  businessDays: number;
  workingDays: number;
  weekendDays: number;
  // Additional breakdown
  breakdown: {
    years: number;
    months: number;
    days: number;
  };
}

export interface DateCalcOptions {
  mode?: DateCalcMode;
  weekend?: WeekendConfig;
  excludeEndDate?: boolean;
  excludeHolidays?: Date[];
}

export function diffBetween(a: Date, b: Date, options: DateCalcOptions = {}): DateDiff {
  const { weekend = SAUDI_WEEKEND, excludeHolidays = [] } = options;
  
  const ms = Math.max(0, b.getTime() - a.getTime());
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  const totalWeeks = Math.floor(totalDays / 7);
  const years = Math.floor(totalDays / 365.25);
  const months = Math.floor(totalDays / 30.44);

  // Calculate business/working days
  const { workingDays, weekendDays } = calculateWorkingDays(a, b, weekend, excludeHolidays);

  // Breakdown into years, months, days
  const breakdown = calculateBreakdown(a, b);

  return { 
    ms, totalSeconds, totalMinutes, totalHours, totalDays, totalWeeks, 
    years, months, 
    businessDays: workingDays, // Alias for backward compatibility
    workingDays, 
    weekendDays,
    breakdown 
  };
}

/**
 * Calculate working days and weekend days between two dates
 * Configurable weekend days
 */
export function calculateWorkingDays(
  start: Date, 
  end: Date, 
  weekend: WeekendConfig = SAUDI_WEEKEND,
  excludeHolidays: Date[] = []
): { workingDays: number; weekendDays: number } {
  let workingDays = 0;
  let weekendDays = 0;
  const current = new Date(start);
  const weekendDayNumbers = getWeekendDays(weekend);
  const holidayTimes = excludeHolidays.map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    const currentTime = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
    const isHoliday = holidayTimes.includes(currentTime);
    
    if (weekendDayNumbers.includes(dayOfWeek)) {
      weekendDays++;
    } else if (!isHoliday) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return { workingDays, weekendDays };
}

/**
 * Calculate business days between two dates (backward compatibility)
 * Saudi weekend is Friday and Saturday
 */
export function calculateBusinessDays(start: Date, end: Date): number {
  return calculateWorkingDays(start, end, SAUDI_WEEKEND).workingDays;
}

/**
 * Calculate breakdown in years, months, and days
 */
export function calculateBreakdown(start: Date, end: Date): { years: number; months: number; days: number } {
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}

// ============================================
// Hijri Calendar Support
// ============================================

export interface HijriDateInfo {
  year: number;
  month: number;
  day: number;
  monthName: string;
  monthNameAr: string;
}

const HIJRI_MONTHS = [
  { en: 'Muharram', ar: 'محرم' },
  { en: 'Safar', ar: 'صفر' },
  { en: 'Rabi al-Awwal', ar: 'ربيع الأول' },
  { en: 'Rabi al-Thani', ar: 'ربيع الثاني' },
  { en: 'Jumada al-Awwal', ar: 'جمادى الأولى' },
  { en: 'Jumada al-Thani', ar: 'جمادى الآخرة' },
  { en: 'Rajab', ar: 'رجب' },
  { en: 'Shaban', ar: 'شعبان' },
  { en: 'Ramadan', ar: 'رمضان' },
  { en: 'Shawwal', ar: 'شوال' },
  { en: 'Dhu al-Qadah', ar: 'ذو القعدة' },
  { en: 'Dhu al-Hijjah', ar: 'ذو الحجة' },
];

/**
 * Convert Gregorian date to Hijri
 */
export function toHijri(date: Date): HijriDateInfo {
  if (HijriDate) {
    try {
      const hijri = HijriDate.toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
      const monthInfo = HIJRI_MONTHS[hijri.hm - 1] || { en: 'Unknown', ar: 'غير معروف' };
      return {
        year: hijri.hy,
        month: hijri.hm,
        day: hijri.hd,
        monthName: monthInfo.en,
        monthNameAr: monthInfo.ar,
      };
    } catch (e) {
      // Fallback to approximation
    }
  }
  
  // Fallback: approximate conversion
  // This is a simplified algorithm and may not be accurate
  const jd = gregorianToJulian(date);
  return julianToHijri(jd);
}

/**
 * Convert Hijri date to Gregorian
 */
export function fromHijri(year: number, month: number, day: number): Date {
  if (HijriDate) {
    try {
      const gregorian = HijriDate.toGregorian(year, month, day);
      return new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd);
    } catch (e) {
      // Fallback to approximation
    }
  }
  
  // Fallback: approximate conversion
  const jd = hijriToJulian(year, month, day);
  return julianToGregorian(jd);
}

/**
 * Format Hijri date as string
 */
export function formatHijri(hijri: HijriDateInfo, locale: 'ar' | 'en' = 'ar'): string {
  const monthName = locale === 'ar' ? hijri.monthNameAr : hijri.monthName;
  return `${hijri.day} ${monthName} ${hijri.year}`;
}

// Helper functions for Hijri conversion fallback
function gregorianToJulian(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function julianToHijri(jd: number): HijriDateInfo {
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  
  const monthInfo = HIJRI_MONTHS[month - 1] || { en: 'Unknown', ar: 'غير معروف' };
  
  return {
    year,
    month,
    day,
    monthName: monthInfo.en,
    monthNameAr: monthInfo.ar,
  };
}

function hijriToJulian(year: number, month: number, day: number): number {
  return day + Math.ceil(29.5001 * (month - 1) + 0.99) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + 1948440 - 385;
}

function julianToGregorian(jd: number): Date {
  const l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  const l2 = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l2 + 1)) / 1461001);
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l3) / 2447);
  const day = l3 - Math.floor((2447 * j) / 80);
  const l4 = Math.floor(j / 11);
  const month = j + 2 - 12 * l4;
  const year = 100 * (n - 49) + i + l4;
  
  return new Date(year, month - 1, day);
}

// ============================================
// Date Utilities
// ============================================

/**
 * Format date based on locale
 */
export function formatDate(date: Date, locale: 'ar' | 'en' = 'ar', includeHijri = true): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  };
  
  const gregorian = date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', options);
  
  if (includeHijri) {
    const hijri = toHijri(date);
    const hijriStr = formatHijri(hijri, locale);
    return `${gregorian} (${hijriStr})`;
  }
  
  return gregorian;
}

/**
 * Get today's date in both calendars
 */
export function getTodayBoth(): { gregorian: Date; hijri: HijriDateInfo } {
  const today = new Date();
  return {
    gregorian: today,
    hijri: toHijri(today),
  };
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Add years to a date
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Add working days to a date (skipping weekends and holidays)
 */
export function addWorkingDays(
  date: Date, 
  days: number, 
  weekend: WeekendConfig = SAUDI_WEEKEND,
  excludeHolidays: Date[] = []
): Date {
  const result = new Date(date);
  const weekendDayNumbers = getWeekendDays(weekend);
  const holidayTimes = excludeHolidays.map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
  
  let remaining = days;
  const direction = days >= 0 ? 1 : -1;
  remaining = Math.abs(remaining);
  
  while (remaining > 0) {
    result.setDate(result.getDate() + direction);
    const dayOfWeek = result.getDay();
    const currentTime = new Date(result.getFullYear(), result.getMonth(), result.getDate()).getTime();
    const isHoliday = holidayTimes.includes(currentTime);
    
    if (!weekendDayNumbers.includes(dayOfWeek) && !isHoliday) {
      remaining--;
    }
  }
  
  return result;
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date, weekend: WeekendConfig = SAUDI_WEEKEND): boolean {
  const weekendDays = getWeekendDays(weekend);
  return weekendDays.includes(date.getDay());
}

/**
 * Check if a date is a working day
 */
export function isWorkingDay(
  date: Date, 
  weekend: WeekendConfig = SAUDI_WEEKEND,
  holidays: Date[] = []
): boolean {
  if (isWeekend(date, weekend)) return false;
  const dateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const holidayTimes = holidays.map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
  return !holidayTimes.includes(dateTime);
}

/**
 * Get next working day
 */
export function getNextWorkingDay(
  date: Date,
  weekend: WeekendConfig = SAUDI_WEEKEND,
  holidays: Date[] = []
): Date {
  let result = new Date(date);
  result.setDate(result.getDate() + 1);
  
  while (!isWorkingDay(result, weekend, holidays)) {
    result.setDate(result.getDate() + 1);
  }
  
  return result;
}

/**
 * Get previous working day
 */
export function getPreviousWorkingDay(
  date: Date,
  weekend: WeekendConfig = SAUDI_WEEKEND,
  holidays: Date[] = []
): Date {
  let result = new Date(date);
  result.setDate(result.getDate() - 1);
  
  while (!isWorkingDay(result, weekend, holidays)) {
    result.setDate(result.getDate() - 1);
  }
  
  return result;
}

/**
 * Count working days in a month
 */
export function getWorkingDaysInMonth(
  year: number,
  month: number, // 0-indexed
  weekend: WeekendConfig = SAUDI_WEEKEND,
  holidays: Date[] = []
): number {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // Last day of month
  return calculateWorkingDays(start, end, weekend, holidays).workingDays;
}
