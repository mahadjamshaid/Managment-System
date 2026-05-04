import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { attendance, department, employees } from "../db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { paginationSchema } from "../schemas/paginationSchema";
import { updateAttendanceSchema } from "../schemas/updateAttendance.schema";
import { getTodayDateString } from "../utils/dateUtils";
import { deriveStatus } from "../utils/attendance.utils";

// CHECK IN 
export const adminCheckIn = async (req: Request, res: Response, next: NextFunction) => {
  const { checkInTime, status: bodyStatus } = req.body;
  const id = Number(req.body.employeeId);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid employee id" });
  }

  const checkInDate = checkInTime ? new Date(checkInTime) : new Date();
  const offset = checkInDate.getTimezoneOffset();
  const localDate = new Date(checkInDate.getTime() - (offset * 60 * 1000));
  const recordDateStr = localDate.toISOString().split("T")[0];

  const derivedStatus = deriveStatus(checkInDate);
  const finalStatus = bodyStatus || derivedStatus;

  try {
    // Check if employee is active and wether employee is found or not
    const [employee] = await db.select().from(employees).where(eq(employees.id, id)).limit(1);

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    if (employee.status === "inactive") {
      return res.status(400).json({ error: "Inactive employees cannot check in." });
    }

    const [employeeDepartment] = await db
      .select()
      .from(department)
      .where(eq(department.id, employee.departmentId))
      .limit(1);

    if (!employeeDepartment) {
      return res.status(400).json({ error: "Employee department not found" });
    }

    // Check if already checked in today
    const [existingRecord] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, id), eq(attendance.date, recordDateStr)))
      .limit(1);

    if (existingRecord) {
      return res.status(400).json({ error: "Employee already checked in for today" });
    }

    const [newRecord] = await db
      .insert(attendance)
      .values({
        employeeId: id,
        shiftId: employeeDepartment.shiftId,
        date: recordDateStr,
        status: finalStatus,
        checkInTime: checkInDate,
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Checked in successfully",
      data: newRecord
    });
  } catch (error) {
    console.error("Error during check-in:", error);
    next(error);
  }
};

// CHECK OUT

export const adminCheckOut = async (req: Request, res: Response, next: NextFunction) => {
  const { checkOutTime } = req.body;
  const id = Number(req.body.employeeId);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid employee id" });
  }

  const checkOutDate = checkOutTime ? new Date(checkOutTime) : new Date();
  const offset = checkOutDate.getTimezoneOffset();
  const localDate = new Date(checkOutDate.getTime() - (offset * 60 * 1000));
  const recordDateStr = localDate.toISOString().split("T")[0];

  try {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    if (employee.status === "inactive") {
      return res.status(400).json({ error: "Inactive employees cannot check out" });
    }

    // Check if check-in exists for today
    const [existingRecord] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, id), eq(attendance.date, recordDateStr)))
      .limit(1);

    if (!existingRecord) {
      return res.status(404).json({ error: "No check-in found for today. Please check-in first." });
    }

    if (!existingRecord.checkInTime) {
      return res.status(400).json({ error: "No valid check-in exists for this record" });
    }

    if (existingRecord.checkOutTime) {
      return res.status(400).json({ error: "Employee already checked out for today" });
    }

    const [updated] = await db
      .update(attendance)
      .set({ checkOutTime: checkOutDate })
      .where(eq(attendance.id, existingRecord.id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Checked out successfully",
      data: updated
    });
  } catch (error) {
    console.error("Error during check-out:", error);
    next(error);
  }
};

// Admin gets all attendace

export const getAllAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = paginationSchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query parameters" })
    }

    const page = Math.max(1, Number(parsed.data.page));
    const limit = Math.min(50, Number(parsed.data.limit));
    const offset = (page - 1) * limit;
    const filterDate = parsed.data.date;
    const filterStatus = parsed.data.status;

    // When a date is specified, we query from employees (LEFT JOIN attendance)
    // so absent employees (no record for that day) are also shown.
    if (filterDate) {
      // Get all active employees with their attendance for the given date
      const allEmployees = await db
        .select({
          employeeId: employees.id,
          employeeName: employees.name,
          employeeDepartment: employees.departmentId,
          attendanceId: attendance.id,
          date: attendance.date,
          status: attendance.status,
          checkInTime: attendance.checkInTime,
          checkOutTime: attendance.checkOutTime,
        })
        .from(employees)
        .leftJoin(
          attendance,
          and(eq(attendance.employeeId, employees.id), eq(attendance.date, filterDate))
        )
        .where(eq(employees.status, "active"))
        .orderBy(employees.name);

      // Map: employees without a record are treated as Absent
      const mapped = allEmployees.map(row => ({
        id: row.attendanceId ?? null,
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        employeeDepartment: row.employeeDepartment,
        date: row.date ?? filterDate,
        // TODO: Remove this fallback once CRON-based Absent records are stored in DB
        status: row.status ?? "Absent",
        checkInTime: row.checkInTime ?? null,
        checkOutTime: row.checkOutTime ?? null,
      }));

      // Apply status filter after mapping (so "Absent" filter works too)
      const filtered = filterStatus
        ? mapped.filter(r => r.status === filterStatus)
        : mapped;

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit);
      const records = filtered.slice(offset, offset + limit);

      return res.status(200).json({
        success: true,
        message: "Attendance records fetched",
        data: { page, limit, total, totalPages, records }
      });
    }

    // No date filter: query from attendance table directly (existing behavior)
    const conditions = [];
    if (parsed.data.status) {
      conditions.push(eq(attendance.status, parsed.data.status));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.select({
      id: attendance.id,
      employeeId: attendance.employeeId,
      date: attendance.date,
      status: attendance.status,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      employeeName: employees.name,
      employeeDepartment: employees.departmentId
    })
      .from(attendance)
      .leftJoin(employees, eq(attendance.employeeId, employees.id))
      .where(whereClause)
      .orderBy(desc(attendance.date), desc(attendance.checkInTime))
      .limit(limit)
      .offset(offset);

    const totalResult = await db.select({ count: count() }).from(attendance).where(whereClause);
    const total = totalResult[0].count;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: "Attendance records fetched",
      data: {
        page,
        limit,
        total,
        totalPages,
        records: data
      }
    });
  } catch (error) {
    console.error("Error fetching all attendance:", error);
    next(error);
  }
};

// Admin gets stats
export const getAdminStats = async (req: Request, res: Response, next: NextFunction) => {
  const today = getTodayDateString();
  try {
    // 1. Get total active employees
    const [totalEmployees] = await db.select({ count: count() })
      .from(employees)
      .where(eq(employees.status, "active"));

    // 2. Get today's attendance records
    const attendanceToday = await db.select()
      .from(attendance)
      .where(eq(attendance.date, today));

    // 3. Compute stats from today's records
    const presentToday = attendanceToday.filter(r => r.status === "Present" || r.status === "Late").length;
    const lateToday = attendanceToday.filter(r => r.status === "Late").length;

    // 4. Absent = Total Active - Total who have a record today
    const absentToday = Math.max(0, totalEmployees.count - attendanceToday.length);

    return res.status(200).json({
      success: true,
      message: "Admin stats fetched",
      data: {
        totalEmployees: totalEmployees.count,
        presentToday,
        lateToday,
        absentToday
      }
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    next(error);
  }
};

// Admin getsAttendance by Employee id

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
    return res.status(200).json({
      success: true,
      message: "Employee attendance records fetched",
      data: records
    });
  } catch (error) {
    console.error("Error fetching attendance by employee ID:", error);
    next(error);
  }
};

export const employeeCheckIn = async (req: Request, res: Response, next: NextFunction) => {
  const today = getTodayDateString();
  const id = req.user!.id;

  try {
    // Check if employee is active and wether employee is found or not
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id))
      .limit(1);

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    if (employee.status === "inactive") {
      return res.status(400).json({ success: false, message: "Inactive employees cannot check in." });
    }

    const [employeeDepartment] = await db
      .select()
      .from(department)
      .where(eq(department.id, employee.departmentId))
      .limit(1);

    if (!employeeDepartment) {
      return res.status(400).json({ success: false, message: "Employee department not found" });
    }

    // Check if already checked in today
    const [existingRecord] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, id), eq(attendance.date, today)))
      .limit(1);

    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: "Employee already checked in for today"
      });
    }

    const [newRecord] = await db
      .insert(attendance)
      .values({
        employeeId: id,
        shiftId: employeeDepartment.shiftId,
        date: today,
        status: deriveStatus(new Date()),
        checkInTime: new Date(),
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Checked in successfully",
      data: newRecord
    });
  } catch (error) {
    console.error("Error during check-in:", error);
    next(error);
  }
};

// Employee CHECK OUT

export const employeeCheckOut = async (req: Request, res: Response, next: NextFunction) => {
  const id = req.user!.id;

  const today = getTodayDateString();

  try {

    const [employee] = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" })
    }

    if (employee.status === "inactive") {
      return res.status(403).json({ success: false, message: "Inactive employees cannot check out" })
    }


    // Check if check-in exists for today
    const [existingRecord] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, id), eq(attendance.date, today)))
      .limit(1);

    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: "No check-in found for today. Please check-in first."
      });
    }

    if (!existingRecord.checkInTime) {
      return res.status(400).json({
        success: false,
        message: "No valid check-in exists for this record"
      });
    }

    if (existingRecord.checkOutTime) {
      return res.status(409).json({ success: false, message: "Employee already checked out for today" });
    }

    const [updated] = await db
      .update(attendance)
      .set({ checkOutTime: new Date() })
      .where(eq(attendance.id, existingRecord.id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Checked out successfully",
      data: updated
    });
  } catch (error) {
    console.error("Error during check-out:", error);
    next(error);
  }
};


// Employee gets their today attendance only 

export const getEmployeeTodayAttendance = async (req: Request, res: Response, next: NextFunction) => {
  const id = req.user!.id;
  const today = getTodayDateString();

  try {
    const [record] = await db.select()
      .from(attendance)
      .where(
        and(eq(attendance.employeeId, id), eq(attendance.date, today))
      ).limit(1);
    return res.status(200).json({
      success: true,
      message: "Today's attendance",
      data: record || null,
    })
  } catch (error) {
    console.error("Error fetching attendance for employee today:", error)
    next(error);
  }
};

// employees get their 30 days records

export const getMyRecord = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id = req.user!.id;

  try {
    const record = await db
      .select()
      .from(attendance)
      .where(eq(attendance.employeeId, id))
      .orderBy(desc(attendance.date))
      .limit(30);

    if (record.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No records found",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendance records fetched",
      data: record,
    });

  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return res.status(500).json({
      error: "Failed to fetch attendance records. The database might be down."
    });
  }
};

// Admin update the attendance manually 

export const updateAttendance = async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid attendance id" });
  }

  const parsed = updateAttendanceSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten(),
    });
  }

  const data = parsed.data;

  try {
    const [record] = await db
      .select()
      .from(attendance)
      .where(eq(attendance.id, id))
      .limit(1);

    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }

    // 1. Absent override (explicit mode switch)
    if (data.status === "Absent") {
      const [updated] = await db
        .update(attendance)
        .set({
          status: "Absent",
          checkInTime: null,
          checkOutTime: null,
        })
        .where(eq(attendance.id, id))
        .returning();

      return res.status(200).json({
        success: true,
        message: "Marked as Absent",
        data: updated,
      });
    }

    // 2. Merge times safely
    const updatedCheckIn = data.checkInTime
      ? new Date(data.checkInTime)
      : record.checkInTime;

    const updatedCheckOut = data.checkOutTime
      ? new Date(data.checkOutTime)
      : record.checkOutTime;

    // 3. Safety check (time consistency)
    if (updatedCheckIn && updatedCheckOut) {
      if (updatedCheckOut < updatedCheckIn) {
        return res.status(400).json({
          error: "Check-out cannot be before check-in",
        });
      }
    }

    // 4. Derive status (Time drives status)
    let finalStatus = record.status;
    if (updatedCheckIn) {
      finalStatus = deriveStatus(updatedCheckIn);
    }

    const [updated] = await db
      .update(attendance)
      .set({
        checkInTime: updatedCheckIn,
        checkOutTime: updatedCheckOut,
        status: finalStatus,
      })
      .where(eq(attendance.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    next(error);
  }
};


