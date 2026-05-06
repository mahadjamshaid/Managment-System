import { formatPKTDateTime } from "../utils/time.utils.js";

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
  adminStatus: string | null;
}

export const toAttendanceResponse = (record: any, extra?: any): AttendanceResponse => {
  const finalDate = record.attendanceDate || record.date;
  return {
    id: record.id ?? null,
    employeeId: record.employeeId ?? extra?.employeeId,
    employeeName: extra?.employeeName,
    employeeDepartment: extra?.employeeDepartment,
    attendanceDate: finalDate,
    date: finalDate,
    status: record.status ?? "Absent",
    // PHASE 1: Format at the edge
    checkInTime: formatPKTDateTime(record.checkInTime),
    checkOutTime: formatPKTDateTime(record.checkOutTime),
    // PHASE 6: Preserve raw ISO for Edit Modal
    checkInTimeRaw: record.checkInTime ? new Date(record.checkInTime).toISOString() : null,
    checkOutTimeRaw: record.checkOutTime ? new Date(record.checkOutTime).toISOString() : null,
    workMinutes: record.workMinutes ?? null,
    adminStatus: record.adminStatus ?? null,
  };
};
