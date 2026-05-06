import { formatPKTDateTime, toPKTRawISOString } from "../utils/time.utils.js";

export interface AttendanceResponse {
  id: number | null;
  employeeId?: number;
  employeeName?: string;
  employeeDepartment?: number;
  attendanceDate: string;
  date: string;
  status: string;
  // Display fields
  checkInTime: string | null;
  checkOutTime: string | null;
  // Raw fields for editing
  checkInTimeRaw: string | null;
  checkOutTimeRaw: string | null;
  workMinutes: number | null;
  requiredWorkMinutes: number | null;
  checkoutGraceMinutes: number | null;
  adminStatus: string | null;
}

export const toAttendanceResponse = (record: any, extra?: any): AttendanceResponse => {
  const finalDate = record.attendanceDate || record.date;
  return {
    id: record.id ?? null,
    employeeId: record.employeeId ?? extra?.employeeId,
    employeeName: extra?.employeeName || record.employeeName,
    employeeDepartment: extra?.employeeDepartment || record.employeeDepartment,
    attendanceDate: finalDate,
    date: finalDate,
    status: record.status ?? "Absent",
    // PHASE 1: Format at the edge
    checkInTime: formatPKTDateTime(record.checkInTime),
    checkOutTime: formatPKTDateTime(record.checkOutTime),
    // PHASE 6: Preserve real ISO instants for Edit Modal
    checkInTimeRaw: toPKTRawISOString(record.checkInTime),
    checkOutTimeRaw: toPKTRawISOString(record.checkOutTime),
    workMinutes: record.workMinutes ?? null,
    requiredWorkMinutes: record.requiredWorkMinutes ?? null,
    checkoutGraceMinutes: record.checkoutGraceMinutes ?? null,
    adminStatus: record.adminStatus ?? null,
  };
};
