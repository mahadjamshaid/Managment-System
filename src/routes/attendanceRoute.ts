import { Router } from "express";
import {
  getAllAttendance,
  getAttendanceByEmployeeId,
  employeeCheckIn,
  employeeCheckOut,
  getEmployeeTodayAttendance,
  getMyRecord,
  getAttendanceSummary,
  getEmployeeHistory,
  getDepartmentAttendance,
} from "../controllers/attendanceController.js";
import { correctAttendance } from "../controllers/attendanceCorrectionController.js";
import { validate } from "../middleware/validate.js";
import { authenticateToken, authorize } from "../middleware/auth.js";
import {
  employeeCheckInSchema,
  employeeCheckOutSchema,
} from "../schemas/attendanceSchema.js";

const router = Router();

router.use(authenticateToken); // Protect all attendance routes

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Attendance tracking
 */

/**
 * @swagger
 * /attendance:
 *   get:
 *     summary: Get all attendance records with pagination
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         required: false
 *         description: Page number (default is 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         required: false
 *         description: Number of records per page (default is 10)
 *     responses:
 *       200:
 *         description: Paginated list of attendance records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 total:
 *                   type: integer
 *                   example: 150
 *                 totalPages:
 *                   type: integer
 *                   example: 15
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Attendance'
 */
router.get("/", authorize(["admin"]), getAllAttendance);

router.get("/employee/today", authorize(["employee"]), getEmployeeTodayAttendance);

router.get("/employee/my-records", authorize(["employee"]), getMyRecord);

router.get("/:employeeId", authorize(["admin"]), getAttendanceByEmployeeId);

// UNIFIED CORRECTION ENDPOINT
router.post("/correct", authorize(["admin"]), correctAttendance);

router.post("/employee/check-in", authorize(["employee"]), validate(employeeCheckInSchema), employeeCheckIn)

router.post("/employee/check-out", authorize(["employee"]), validate(employeeCheckOutSchema), employeeCheckOut)

router.get("/reports/summary", authorize(["admin"]), getAttendanceSummary);
router.get("/reports/employee/:id", authorize(["admin"]), getEmployeeHistory);
router.get("/reports/department/:id", authorize(["admin"]), getDepartmentAttendance);

export default router;

