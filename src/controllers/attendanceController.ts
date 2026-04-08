import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { attendance, employees } from "../db/schema";
import { eq, and, count } from "drizzle-orm";
import { paginationSchema } from "../schemas/paginationSchema";

export const checkIn = async (req: Request, res: Response, next: NextFunction) => {
  const { employeeId, status } = req.body;
  const today = new Date().toISOString().split("T")[0];

  try {
    // Check if employee is active
    const [employee] = await db.select().from(employees).where(eq(employees.id, Number(employeeId))).limit(1);
    
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    if (employee.status === "inactive") {
      return res.status(400).json({ error: "Inactive employees cannot check in." });
    }

    // Check if already checked in today
    const [existingRecord] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, Number(employeeId)), eq(attendance.date, today)))
      .limit(1);

    if (existingRecord) {
      return res.status(400).json({ error: "Employee already checked in for today" });
    }

    const newRecord = await db
      .insert(attendance)
      .values({
        employeeId: Number(employeeId),
        date: today,
        status: status || "Present",
        checkInTime: new Date(),
      })
      .returning();

    res.status(201).json({ message: "Checked in successfully", data: newRecord[0] });
  } catch (error) {
    console.error("Error during check-in:", error);
    next(error);
  }
};

export const checkOut = async (req: Request, res: Response, next: NextFunction) => {
  const { employeeId } = req.body;
  const today = new Date().toISOString().split("T")[0];

  try {
    // Check if check-in exists for today
    const [existingRecord] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, Number(employeeId)), eq(attendance.date, today)))
      .limit(1);

    if (!existingRecord) {
      return res.status(404).json({ error: "No check-in found for today. Please check-in first." });
    }

    if (existingRecord.checkOutTime) {
      return res.status(400).json({ error: "Employee already checked out for today" });
    }

    const updated = await db
      .update(attendance)
      .set({ checkOutTime: new Date() })
      .where(eq(attendance.id, existingRecord.id))
      .returning();

    res.json({ message: "Checked out successfully", data: updated[0] });
  } catch (error) {
    console.error("Error during check-out:", error);
    next(error);
  }
};

export const getAllAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = paginationSchema.parse(req.query);

    const page = Math.max(1, Number(parsed.page));
    const limit = Math.min(50, Number(parsed.limit));
    const offset = (page - 1) * limit;

    const data = await db.select()
      .from(attendance)
      .limit(limit)
      .offset(offset);

    const totalResult = await db.select({ count: count() }).from(attendance);
    const total = totalResult[0].count;
    const totalPages = Math.ceil(total / limit);

    res.json({
      page,
      limit,
      total,
      totalPages,
      data
    });
  } catch (error) {
    console.error("Error fetching all attendance:", error);
    next(error);
  }
};

export const getAttendanceByEmployeeId = async (req: Request, res: Response, next: NextFunction) => {
  const employeeId = Number(req.params.employeeId);
  if (isNaN(employeeId)) {
    return res.status(400).json({ error: "Invalid employee ID format" });
  }
  try {
    const records = await db
      .select()
      .from(attendance)
      .where(eq(attendance.employeeId, employeeId));
    res.json(records);
  } catch (error) {
    console.error("Error fetching attendance by employee ID:", error);
    next(error);
  }
};
