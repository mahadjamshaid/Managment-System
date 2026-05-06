/**
 * Centralized Time Utilities for Attendance System
 * All logic MUST use these helpers to ensure consistency across servers.
 * Standard Timezone: PKT (Pakistan Standard Time, UTC+5)
 */

/**
 * Returns the current time as a PKT Date object.
 * This is the ONLY way to get "now" in the controllers.
 */
export const getCurrentPKTTime = (): Date => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  );
};

/**
 * Converts any date or string into a PKT Date object.
 */
export const toPKT = (date: Date | string): Date => {
  return new Date(
    new Date(date).toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  );
};

/**
 * Returns the PKT date string (YYYY-MM-DD).
 * Use this for the 'attendanceDate' snapshot field.
 */
export const getPKTDateString = (date?: Date | string): string => {
  const targetDate = date ? toPKT(date) : getCurrentPKTTime();
  // Using Intl to ensure YYYY-MM-DD format regardless of locale
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: "Asia/Karachi", 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(targetDate);
};

/**
 * Normalizes a Date object to PKT for comparison logic.
 */
export const normalizeToPKT = (date: Date): Date => {
  return toPKT(date);
};
