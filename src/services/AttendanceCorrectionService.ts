import { db } from "../db/index.js";
import { attendance, department, employees, shift } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { toPKT, getPKTDateString, getCurrentPKTTime } from "../utils/time.utils.js";
import { deriveCheckInStatus, calculateWorkMinutes, deriveFinalStatus } from "../utils/attendance.policy.js";
import type { AttendanceCorrectionInput } from "../schemas/attendanceCorrection.schema.js";

export class AttendanceCorrectionService {
  static async correctAttendance(input: AttendanceCorrectionInput) {
    const { employeeId, date, checkInTime, checkOutTime, adminStatus } = input;

    if (!employeeId || !date) {
      throw new Error("Missing required fields: employeeId and date are mandatory.");
    }

    // 1. FETCH CONTEXT
    const [existingRecord] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, employeeId), eq(attendance.attendanceDate, date)))
      .limit(1);

    // Fetch employee & shift data for snapshot (needed for both CREATE and TIME_OVERRIDE)
    const [employeeData] = await db
      .select({
        shiftId: department.shiftId,
        startTime: shift.startTime,
        graceMinutes: shift.graceMinutes,
        breakMinutes: shift.breakMinutes,
        requiredWorkMinutes: shift.requiredWorkMinutes,
        checkoutGraceMinutes: shift.checkoutGraceMinutes,
      })
      .from(employees)
      .innerJoin(department, eq(employees.departmentId, department.id))
      .innerJoin(shift, eq(department.shiftId, shift.id))
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (!employeeData) {
      throw new Error("Employee or shift data not found");
    }

    // 2. DETERMINE MODE
    let mode: "FULL_OVERRIDE" | "TIME_OVERRIDE" = "TIME_OVERRIDE";
    if (adminStatus) {
      mode = "FULL_OVERRIDE";
    }

    // 3. CONSTRUCT FINAL STATE (Decide First, Write Once)
    const pktCheckIn = checkInTime ? toPKT(checkInTime) : (existingRecord?.checkInTime ?? null);
    const pktCheckOut = checkOutTime ? toPKT(checkOutTime) : (existingRecord?.checkOutTime ?? null);

    let finalStatus: string = existingRecord?.status || "Present";
    let finalCheckInStatus: string | null = existingRecord?.checkInStatus || null;
    let finalWorkMinutes: number | null = existingRecord?.workMinutes || null;
    let finalRequiredWorkMinutes: number | null = existingRecord?.requiredWorkMinutes || null;
    let finalCheckoutGraceMinutes: number | null = existingRecord?.checkoutGraceMinutes || null;

    // Snapshot Resolution Logic: 
    // IF snapshot exists and (Employee and Date haven't changed) -> KEEP IT
    // ELSE -> Fetch from employeeData (current shift rules)
    const contextChanged = existingRecord && (existingRecord.employeeId !== employeeId || existingRecord.attendanceDate !== date);
    
    if (!finalRequiredWorkMinutes || !finalCheckoutGraceMinutes || contextChanged) {
      finalRequiredWorkMinutes = employeeData.requiredWorkMinutes;
      finalCheckoutGraceMinutes = employeeData.checkoutGraceMinutes;
    }

    if (mode === "FULL_OVERRIDE") {
      // FULL_OVERRIDE: Absolute administrative truth
      finalStatus = adminStatus!;
      // DO NOT run policy, DO NOT modify workMinutes
    } else {
      // TIME_OVERRIDE Logic
      if (pktCheckIn) {
        finalCheckInStatus = deriveCheckInStatus(
          pktCheckIn,
          employeeData.startTime,
          employeeData.graceMinutes
        );

        if (pktCheckOut) {
          finalWorkMinutes = calculateWorkMinutes(
            pktCheckIn,
            pktCheckOut,
            employeeData.breakMinutes
          );
          finalStatus = deriveFinalStatus(
            finalCheckInStatus as "Present" | "Late", 
            finalWorkMinutes,
            finalRequiredWorkMinutes || 480,
            finalCheckoutGraceMinutes || 15
          );
        } else {
          // If only check-in exists, it's an active session or a manual check-in entry
          finalStatus = finalCheckInStatus;
          finalWorkMinutes = null;
        }
      } else if (pktCheckOut && !pktCheckIn) {
        throw new Error("Cannot set check-out time without a check-in time.");
      }
    }

    // 4. DETERMINE attendanceDate
    // Priority: checkInTime > existingRecord.attendanceDate > provided date
    let finalAttendanceDate = date;
    if (pktCheckIn) {
      finalAttendanceDate = getPKTDateString(pktCheckIn);
    } else if (existingRecord?.attendanceDate) {
      finalAttendanceDate = existingRecord.attendanceDate;
    }

    // 5. DATABASE ACTION
    const values = {
      employeeId,
      shiftId: employeeData.shiftId,
      attendanceDate: finalAttendanceDate,
      date: finalAttendanceDate, // Legacy compat
      shiftStartTime: employeeData.startTime,
      graceMinutes: employeeData.graceMinutes,
      breakMinutes: employeeData.breakMinutes,
      checkInTime: pktCheckIn,
      checkOutTime: pktCheckOut,
      checkInStatus: finalCheckInStatus,
      status: finalStatus,
      workMinutes: finalWorkMinutes,
      requiredWorkMinutes: finalRequiredWorkMinutes,
      checkoutGraceMinutes: finalCheckoutGraceMinutes,
      updatedAt: getCurrentPKTTime(),
    };

    if (existingRecord) {
      const [updated] = await db
        .update(attendance)
        .set(values)
        .where(eq(attendance.id, existingRecord.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db
        .insert(attendance)
        .values({
          ...values,
          createdAt: getCurrentPKTTime(),
        })
        .returning();
      return inserted;
    }
  }
}
