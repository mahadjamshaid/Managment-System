import { Router } from "express";
import {
  checkIn,
  checkOut,
  getAllAttendance,
  getAttendanceByEmployeeId,
} from "../controllers/attendanceController";
import { validate } from "../middleware/validate";
import { authenticateToken } from "../middleware/auth";
import { checkInSchema, checkOutSchema } from "../schemas/attendanceSchema";

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
 * /attendance/check-in:
 *   post:
 *     summary: Employee Check-In
 *     description: Record the start of an employee's workday.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *             properties:
 *               employeeId:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [Present, Absent, Late]
 *                 default: Present
 *     responses:
 *       201:
 *         description: Checked in successfully
 *       400:
 *         description: Already checked in for today
 */
router.post("/check-in", validate(checkInSchema), checkIn);

/**
 * @swagger
 * /attendance/check-out:
 *   post:
 *     summary: Employee Check-Out
 *     description: Record the end of an employee's workday.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *             properties:
 *               employeeId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Checked out successfully
 *       404:
 *         description: No check-in found for today
 */
router.post("/check-out", validate(checkOutSchema), checkOut);

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
router.get("/", getAllAttendance);

/**
 * @swagger
 * /attendance/{employeeId}:
 *   get:
 *     summary: Get attendance records for a specific employee
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Employee attendance records
 */
router.get("/:employeeId", getAttendanceByEmployeeId);

export default router;
