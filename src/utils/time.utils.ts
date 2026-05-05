/**
 * Centralized Time Utilities for Attendance System
 * All logic MUST use these helpers to ensure consistency across servers.
 * Standard Timezone: PKT (Pakistan Standard Time, UTC+5)
 */

/**
 * Returns the current time as a PKT Date object.
 * This should be the ONLY way to get "now" in the controllers.
 */
export const getCurrentPKTTime = (): Date => {
  const now = new Date();
  // PKT is UTC+5. This creates a Date object that reflects PKT time
  // regardless of the server's local timezone.
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 5);
};

/**
 * Converts a UTC Date object to a PKT Date object.
 */
export const toPKT = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 5);
};

/**
 * Returns the PKT date string (YYYY-MM-DD).
 * Use this for the 'attendanceDate' snapshot field.
 */
export const getPKTDateString = (date?: Date): string => {
  const targetDate = date ? toPKT(date) : getCurrentPKTTime();
  return targetDate.toISOString().split('T')[0];
};

/**
 * Normalizes a Date object to PKT for comparison logic.
 * Ensures that getHours(), getMinutes(), etc. return PKT values.
 */
export const normalizeToPKT = (date: Date): Date => {
  return toPKT(date);
};
