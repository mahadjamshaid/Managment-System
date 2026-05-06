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

const pad = (value: number): string => value.toString().padStart(2, "0");

const formatStoredPKTDate = (date: Date): string => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toStoredPKTISOString = (date: Date): string => {
  const utcTime = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours() - 5,
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );

  return new Date(utcTime).toISOString();
};

/**
 * Converts an absolute instant into a PKT wall-clock Date object for storage.
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
  if (!date) return formatStoredPKTDate(getCurrentPKTTime());

  const targetDate = date instanceof Date ? date : toPKT(date);
  return formatStoredPKTDate(targetDate);
};

/**
 * Normalizes a Date object to PKT for comparison logic.
 */
export const normalizeToPKT = (date: Date): Date => {
  return toPKT(date);
};

/**
 * Returns a formatted PKT string for UI display.
 * The attendance table stores PKT wall-clock timestamps, so display is built
 * from stored clock components instead of converting the timestamp again.
 */
export const formatPKTDateTime = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;

  const targetDate = date instanceof Date ? date : toPKT(date);
  const hours = targetDate.getHours();
  const minutes = targetDate.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${pad(displayHours)}:${pad(minutes)} ${period}`;
};

/**
 * Converts a stored PKT wall-clock timestamp into the real UTC instant that
 * represents that PKT time. This keeps edit forms stable on Vercel/UTC.
 */
export const toPKTRawISOString = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;

  const targetDate = date instanceof Date ? date : toPKT(date);
  return toStoredPKTISOString(targetDate);
};
