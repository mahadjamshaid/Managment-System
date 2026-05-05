import { z } from "zod";

export const attendanceCorrectionSchema = z.object({
  employeeId: z.number().min(1, "Employee ID is required"),
  date: z.string().min(1, "Date is required").regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  checkInTime: z.string().datetime().nullable().optional(),
  checkOutTime: z.string().datetime().nullable().optional(),
  adminStatus: z.enum(["Absent", "OnLeave"]).nullable().optional(),
  reason: z.string().optional(),
})
.refine((data) => {
  // Must provide either adminStatus OR at least one timestamp
  return !!data.adminStatus || !!data.checkInTime || !!data.checkOutTime;
}, {
  message: "Provide either adminStatus or check-in/out times",
})
.refine((data) => {
  // Time consistency check if both provided
  if (data.checkInTime && data.checkOutTime) {
    return new Date(data.checkOutTime) > new Date(data.checkInTime);
  }
  return true;
}, {
  message: "Check-out time must be after check-in time",
});

export type AttendanceCorrectionInput = z.infer<typeof attendanceCorrectionSchema>;
