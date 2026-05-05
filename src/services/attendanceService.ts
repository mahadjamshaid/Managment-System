import { db } from "../db/index.js";
import { attendance } from "../db/schema.js";
import { and, eq } from "drizzle-orm";

/**
 * Computes the attendance status for a specific employee on a specific date.
 * Does NOT insert anything into the database.
 * Logic:
 * 1. IF record exists -> return stored status
 * 2. ELSE -> return "Absent" (Leaves not yet implemented)
 */
export const getAttendanceStatusForDate = async (employeeId: number, pktDateStr: string) => {
  const [record] = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.employeeId, employeeId),
        eq(attendance.attendanceDate, pktDateStr)
      )
    )
    .limit(1);

  if (record) {
    return record.status;
  }

  // TODO: Check for leaves here once leave table is implemented
  // For now, return "Absent"
  return "Absent";
};
