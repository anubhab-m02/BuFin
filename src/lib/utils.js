import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Local calendar date as YYYY-MM-DD (unlike toISOString(), this does not shift to UTC).
export function todayLocalStr(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// The calendar-day part (YYYY-MM-DD) of a stored transaction date. Rows hold either a plain
// date or, for older rows, an ISO timestamp; the day part is what balances, "spent today" and
// the server's own comparisons all use, so everything reads dates through this.
export function dateOnly(value) {
    return String(value ?? '').slice(0, 10);
}

// A Date at LOCAL midnight for a stored date. `new Date("2026-11-05")` is UTC midnight, which
// getDate()/getMonth() then report as the previous day anywhere behind UTC.
export function parseLocalDate(value) {
    const [year, month, day] = dateOnly(value).split('-').map(Number);
    return new Date(year, month - 1, day);
}

// Last weekday (Mon-Fri) of the given zero-indexed month/year.
function lastWorkingDayOfMonth(year, month) {
    const d = new Date(year, month + 1, 0);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    return d.getDate();
}

// Resolves a recurring plan's `expectedDate` (a day number 1-31, or "last"/"last-working")
// to the actual day-of-month for the given zero-indexed month/year. Single source of truth
// shared by SafeToSpendWidget, FiscalCalendar, and CashFlowForecast.
export function resolveExpectedDay(expectedDate, year, month) {
    if (expectedDate === 'last') return new Date(year, month + 1, 0).getDate();
    if (expectedDate === 'last-working') return lastWorkingDayOfMonth(year, month);
    return parseInt(expectedDate);
}
