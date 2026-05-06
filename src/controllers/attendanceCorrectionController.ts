import { Request, Response, NextFunction } from "express";
import { attendanceCorrectionSchema } from "../schemas/attendanceCorrection.schema.js";
import { AttendanceCorrectionService } from "../services/AttendanceCorrectionService.js";
import { toAttendanceResponse } from "../dto/attendanceDto.js";

export const correctAttendance = async (req: Request, res: Response, next: NextFunction) => {
  console.log("DEBUG: Attendance Correction Payload:", JSON.stringify(req.body, null, 2));
  try {
    const parsed = attendanceCorrectionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten(),
      });
    }

    const result = await AttendanceCorrectionService.correctAttendance(parsed.data);

    return res.status(200).json({
      success: true,
      message: "Attendance corrected successfully",
      data: toAttendanceResponse(result),
    });
  } catch (error: any) {
    console.error("Error in correctAttendance controller:", error);
    return res.status(error.message === "Employee or shift data not found" ? 404 : 400).json({
      success: false,
      message: error.message || "An unexpected error occurred",
    });
  }
};
