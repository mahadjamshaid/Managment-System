import { Request, Response, NextFunction } from "express";
import { db } from "../db/index.js";
import { attendance, department, employees, shift } from "../db/schema.js";
import { eq, and, count, desc, isNull, between } from "drizzle-orm";
import { paginationSchema } from "../schemas/paginationSchema.js";
import { getCurrentPKTTime, getPKTDateString } from "../utils/time.utils.js";
import { deriveCheckInStatus, calculateWorkMinutes, deriveFinalStatus } from "../utils/attendance.policy.js";
import { getAttendanceStatusForDate } from "../services/attendanceService.js";
import { toAttendanceResponse } from "../dto/attendanceDto.js";

// CHECK IN 
// CHECK IN 
// (adminCheckIn removed - use manualEntry instead)

// CHECK OUT
// (adminCheckOut removed - use updateAttendance instead)

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
    if (filterDate) {
      const allEmployees = await db
        .select({
          employeeId: employees.id,
          employeeName: employees.name,
          employeeDepartment: department.name,
          attendanceId: attendance.id,
          date: attendance.attendanceDate,
          status: attendance.status,
          checkInTime: attendance.checkInTime,
          checkOutTime: attendance.checkOutTime,
        })
        .from(employees)
        .leftJoin(department, eq(employees.departmentId, department.id))
        .leftJoin(
          attendance,
          and(eq(attendance.employeeId, employees.id), eq(attendance.attendanceDate, filterDate))
        )
        .where(eq(employees.status, "active"))
        .orderBy(employees.name);

      const mapped = allEmployees.map(row => toAttendanceResponse({
        id: row.attendanceId,
        employeeId: row.employeeId,
        attendanceDate: row.date ?? filterDate,
        status: row.status,
        checkInTime: row.checkInTime,
        checkOutTime: row.checkOutTime,
      }, {
        employeeName: row.employeeName,
        employeeDepartment: row.employeeDepartment
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
      attendanceDate: attendance.attendanceDate, 
      legacyDate: attendance.date,               
      status: attendance.status,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      employeeName: employees.name,
      employeeDepartment: department.name
    })
      .from(attendance)
      .leftJoin(employees, eq(attendance.employeeId, employees.id))
      .leftJoin(department, eq(employees.departmentId, department.id))
      .where(whereClause)
      .orderBy(desc(attendance.attendanceDate), desc(attendance.checkInTime))
      .limit(limit)
      .offset(offset);

    // Transform data to ensure attendanceDate is always present for the frontend
    const sanitizedRecords = data.map(record => toAttendanceResponse({
      ...record,
      attendanceDate: record.attendanceDate || (record.legacyDate ? record.legacyDate.toString() : getPKTDateString())
    }));

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
        records: sanitizedRecords
      }
    });
  } catch (error) {
    console.error("Error fetching all attendance:", error);
    next(error);
  }
};

// Admin gets stats
export const getAdminStats = async (req: Request, res: Response, next: NextFunction) => {
  const today = getPKTDateString();
  try {
    // 1. Get total active employees
    const [totalEmployees] = await db.select({ count: count() })
      .from(employees)
      .where(eq(employees.status, "active"));

    // 2. Get today's attendance records (using new attendanceDate field)
    const attendanceToday = await db.select()
      .from(attendance)
      .where(eq(attendance.attendanceDate, today));

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
      data: records.map(r => toAttendanceResponse(r))
    });
  } catch (error) {
    console.error("Error fetching attendance by employee ID:", error);
    next(error);
  }
};

export const employeeCheckIn = async (req: Request, res: Response, next: NextFunction) => {
  const employeeId = req.user!.id;
  const checkInTime = getCurrentPKTTime();
  const attendanceDate = getPKTDateString(checkInTime);

  try {
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    if (employee.status === "inactive") {
      return res.status(400).json({ success: false, message: "Inactive employees cannot check in." });
    }

    // 1. ACTIVE SESSION GUARD: IF any open session exists -> AUTO-CHECKOUT it (Phase 1.3)
    const [openSession] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, employeeId), isNull(attendance.checkOutTime)))
      .limit(1);

    if (openSession) {
      await db.update(attendance)
        .set({
          checkOutTime: getCurrentPKTTime(),
          status: "ShortDay", // Flag as missed checkout
          updatedAt: getCurrentPKTTime()
        })
        .where(eq(attendance.id, openSession.id));
    }

    // 2. DUPLICATE DAY PREVENTION
    const [existingToday] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, employeeId), eq(attendance.attendanceDate, attendanceDate)))
      .limit(1);

    if (existingToday) {
      return res.status(400).json({ success: false, message: "Already checked in today" });
    }

    // 3. FETCH SHIFT FOR SNAPSHOT
    const [employeeDepartment] = await db
      .select({
        shiftId: department.shiftId,
        startTime: shift.startTime,
        graceMinutes: shift.graceMinutes,
        breakMinutes: shift.breakMinutes,
        requiredWorkMinutes: shift.requiredWorkMinutes,
        checkoutGraceMinutes: shift.checkoutGraceMinutes,
      })
      .from(department)
      .leftJoin(shift, eq(department.shiftId, shift.id))
      .where(eq(department.id, employee.departmentId))
      .limit(1);

    if (!employeeDepartment || !employeeDepartment.startTime) {
      return res.status(400).json({ success: false, message: "Employee department or shift data not found" });
    }

    // 4. COMPUTE INITIAL STATUS
    const startTime = employeeDepartment.startTime!;
    const graceMinutes = employeeDepartment.graceMinutes ?? 0;
    const breakMinutes = employeeDepartment.breakMinutes ?? 0;
    const requiredWorkMinutes = employeeDepartment.requiredWorkMinutes;
    const checkoutGraceMinutes = employeeDepartment.checkoutGraceMinutes;
    const shiftId = employeeDepartment.shiftId!;
    
    // Strict Guard
    if (requiredWorkMinutes == null || checkoutGraceMinutes == null) {
      return res.status(400).json({ success: false, message: "Incomplete shift configuration. Please contact admin." });
    }
    
    const derivedStatus = deriveCheckInStatus(checkInTime, startTime, graceMinutes);

    // 5. SNAPSHOT & INSERT
    const [newRecord] = await db
      .insert(attendance)
      .values({
        employeeId: employeeId,
        shiftId: shiftId!,
        date: attendanceDate, // Legacy compat
        attendanceDate: attendanceDate, // New field
        shiftStartTime: startTime,
        graceMinutes: graceMinutes,
        breakMinutes: breakMinutes ?? 0,
        requiredWorkMinutes: requiredWorkMinutes,
        checkoutGraceMinutes: checkoutGraceMinutes,
        checkInStatus: derivedStatus,
        status: derivedStatus,
        checkInTime: checkInTime,
        createdAt: getCurrentPKTTime(),
        updatedAt: getCurrentPKTTime(),
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Checked in successfully",
      data: toAttendanceResponse(newRecord)
    });
  } catch (error) {
    console.error("Error during check-in:", error);
    next(error);
  }
};

// Employee CHECK OUT

export const employeeCheckOut = async (req: Request, res: Response, next: NextFunction) => {
  const employeeId = req.user!.id;
  const checkOutDate = getCurrentPKTTime();

  try {
    const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    if (employee.status === "inactive") {
      return res.status(403).json({ success: false, message: "Inactive employees cannot check out" });
    }

    // 1. Find OPEN SESSION (checkOutTime IS NULL)
    const [existingRecord] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, employeeId), isNull(attendance.checkOutTime)))
      .limit(1);

    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: "No active check-in found"
      });
    }

    const checkInTime = existingRecord.checkInTime!;

    if (checkOutDate < checkInTime) {
      return res.status(400).json({ success: false, message: "Check-out time cannot be before check-in time" });
    }

    // 2. Fallback Logic: Get shift data
    let shiftStartTime: string;
    let graceMinutes: number;
    let breakMinutes: number;
    let checkInStatus: string;

    const hasSnapshot = existingRecord.shiftStartTime && 
                        existingRecord.graceMinutes !== null && 
                        existingRecord.breakMinutes !== null &&
                        existingRecord.checkInStatus;

    if (hasSnapshot) {
      shiftStartTime = existingRecord.shiftStartTime!;
      graceMinutes = existingRecord.graceMinutes!;
      breakMinutes = existingRecord.breakMinutes!;
      checkInStatus = existingRecord.checkInStatus!;
    } else {
      const [employeeShift] = await db
        .select({
          startTime: shift.startTime,
          graceMinutes: shift.graceMinutes,
          breakMinutes: shift.breakMinutes,
        })
        .from(shift)
        .where(eq(shift.id, existingRecord.shiftId))
        .limit(1);

      if (!employeeShift) {
        return res.status(400).json({ success: false, message: "Original shift data not found for fallback" });
      }

      shiftStartTime = employeeShift.startTime;
      graceMinutes = employeeShift.graceMinutes ?? 0;
      breakMinutes = employeeShift.breakMinutes ?? 0;
      checkInStatus = existingRecord.status;
    }

    // 3. Compute Final Status via Policy
    const workMinutes = calculateWorkMinutes(checkInTime, checkOutDate, breakMinutes);
    
    // Strict Defensive Fallback for legacy records
    if (existingRecord.requiredWorkMinutes == null && existingRecord.checkoutGraceMinutes == null) {
      // Fallback only if snapshot is missing
      const [employeeShift] = await db
        .select({
          requiredWorkMinutes: shift.requiredWorkMinutes,
          checkoutGraceMinutes: shift.checkoutGraceMinutes,
        })
        .from(shift)
        .where(eq(shift.id, existingRecord.shiftId))
        .limit(1);
      
      if (!employeeShift) {
        return res.status(400).json({ success: false, message: "Cannot resolve shift configuration for check-out." });
      }

      existingRecord.requiredWorkMinutes = employeeShift.requiredWorkMinutes;
      existingRecord.checkoutGraceMinutes = employeeShift.checkoutGraceMinutes;
    }

    const reqMin = existingRecord.requiredWorkMinutes ?? 480;
    const graceMin = existingRecord.checkoutGraceMinutes ?? 15;

    const finalStatus = deriveFinalStatus(
      checkInStatus as "Present" | "Late", 
      workMinutes,
      reqMin,
      graceMin
    );

    const [updated] = await db
      .update(attendance)
      .set({ 
        checkOutTime: checkOutDate,
        status: finalStatus,
        workMinutes: workMinutes,
        updatedAt: getCurrentPKTTime()
      })
      .where(eq(attendance.id, existingRecord.id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Checked out successfully",
      data: toAttendanceResponse(updated)
    });
  } catch (error) {
    console.error("Error during check-out:", error);
    next(error);
  }
};


// Employee gets their today attendance only 

export const getEmployeeTodayAttendance = async (req: Request, res: Response, next: NextFunction) => {
  const employeeId = req.user!.id;
  const todayDateStr = getPKTDateString();

  try {
    // 1. Check for ACTIVE SESSION first
    const [activeSession] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, employeeId), isNull(attendance.checkOutTime)))
      .limit(1);

    if (activeSession) {
      // Return with LIVE status (derived from checkInStatus)
      return res.status(200).json({
        success: true,
        message: "Active session found",
        data: toAttendanceResponse({
          ...activeSession,
          status: activeSession.checkInStatus || activeSession.status // Live status
        }),
      });
    }

    // 2. If no active session, check for a record for today (PKT)
    const [todayRecord] = await db
      .select()
      .from(attendance)
      .where(
        and(eq(attendance.employeeId, employeeId), eq(attendance.attendanceDate, todayDateStr))
      )
      .limit(1);

    return res.status(200).json({
      success: true,
      message: todayRecord ? "Today's attendance" : "No attendance found",
      data: todayRecord ? toAttendanceResponse(todayRecord) : null,
    });
  } catch (error) {
    console.error("Error fetching attendance for employee today:", error);
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
      .orderBy(desc(attendance.attendanceDate))
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
      data: record.map(r => toAttendanceResponse(r)),
    });

  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return res.status(500).json({
      error: "Failed to fetch attendance records. The database might be down."
    });
  }
};


// Phase 3: Reporting APIs

export const getAttendanceSummary = async (req: Request, res: Response, next: NextFunction) => {
  const today = getPKTDateString();
  try {
    const [totalEmployees] = await db.select({ count: count() }).from(employees).where(eq(employees.status, "active"));
    const records = await db.select().from(attendance).where(eq(attendance.attendanceDate, today));

    const summary = {
      total: totalEmployees.count,
      present: records.filter(r => r.status === "Present").length,
      late: records.filter(r => r.status === "Late").length,
      halfDay: records.filter(r => r.status === "HalfDay").length,
      shortDay: records.filter(r => r.status === "ShortDay").length,
      absent: Math.max(0, totalEmployees.count - records.length)
    };

    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeHistory = async (req: Request, res: Response, next: NextFunction) => {
  const employeeId = Number(req.params.id);
  const { startDate, endDate } = req.query;

  if (isNaN(employeeId)) return res.status(400).json({ error: "Invalid employee id" });

  try {
    const conditions = [eq(attendance.employeeId, employeeId)];
    
    if (startDate && endDate) {
      conditions.push(between(attendance.attendanceDate, startDate as string, endDate as string));
    }

    const records = await db.select().from(attendance)
      .where(and(...conditions))
      .orderBy(desc(attendance.attendanceDate));

    const mapped = records.map(r => toAttendanceResponse(r));

    return res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentAttendance = async (req: Request, res: Response, next: NextFunction) => {
  const departmentId = Number(req.params.id);
  const date = (req.query.date as string) || getPKTDateString();

  if (isNaN(departmentId)) return res.status(400).json({ error: "Invalid department id" });

  try {
    const records = await db
      .select({
        id: attendance.id,
        employeeName: employees.name,
        status: attendance.status,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime
      })
      .from(employees)
      .leftJoin(attendance, and(eq(attendance.employeeId, employees.id), eq(attendance.attendanceDate, date)))
      .where(and(eq(employees.departmentId, departmentId), eq(employees.status, "active")));

    const mapped = records.map(r => toAttendanceResponse({
      id: r.id,
      status: r.status,
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
    }, {
      employeeName: r.employeeName
    }));

    return res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
};


