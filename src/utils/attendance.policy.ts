/**
 * Attendance Policy Layer
 * This file contains PURE business logic. 
 * RULES:
 * 1. No Database calls.
 * 2. No Request/Response objects.
 * 3. No Timezone logic (Input dates must already be PKT).
 */

export type AttendanceStatus = "Present" | "Late" | "HalfDay" | "ShortDay" | "Absent";

/**
 * Derives the initial check-in status (Present or Late).
 */
export const deriveCheckInStatus = (
  checkInTime: Date,
  shiftStartTimeStr: string,
  graceMinutes: number
): "Present" | "Late" => {
  // Parse shift start time (HH:mm)
  const [shiftHours, shiftMinutes] = shiftStartTimeStr.split(":").map(Number);
  
  // Create a comparison date for the shift start on the SAME day as check-in
  const shiftStart = new Date(checkInTime);
  shiftStart.setHours(shiftHours, shiftMinutes, 0, 0);
  
  // Calculate the late threshold
  const lateThreshold = new Date(shiftStart.getTime() + graceMinutes * 60000);
  
  return checkInTime <= lateThreshold ? "Present" : "Late";
};

/**
 * Calculates net work minutes after break deduction.
 */
export const calculateWorkMinutes = (
  checkInTime: Date,
  checkOutTime: Date,
  breakMinutes: number
): number => {
  if (checkOutTime < checkInTime) {
    throw new Error("Check-out time cannot be before check-in time");
  }

  const diffMs = checkOutTime.getTime() - checkInTime.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);

  // Break Logic: Only subtract if total time worked is more than the break duration
  // This prevents negative duration for very short work sessions.
  if (totalMinutes <= breakMinutes) {
    return totalMinutes;
  }

  return totalMinutes - breakMinutes;
};

/**
 * Derives the final attendance status based on work duration and initial check-in.
 */
export const deriveFinalStatus = (
  checkInStatus: string,
  workMinutes: number
): AttendanceStatus => {
  const FULL_DAY_MINUTES = 8 * 60; // 8 hours
  const HALF_DAY_MINUTES = 5 * 60; // 5 hours
  const SHORT_DAY_MINUTES = 2 * 60; // 2 hours

  if (workMinutes >= FULL_DAY_MINUTES) {
    return checkInStatus === "Late" ? "Late" : "Present";
  }
  
  if (workMinutes >= HALF_DAY_MINUTES) {
    return "HalfDay";
  }

  if (workMinutes >= SHORT_DAY_MINUTES) {
    return "ShortDay";
  }

  return "Absent"; // Too few minutes worked
};
