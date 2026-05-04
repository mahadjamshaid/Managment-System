import { Router } from "express";
import {
  assignShiftToDepartment,
  createDepartment,
  getDepartmentById,
  getDepartments,
  updateDepartment,
} from "../controllers/departmentController.js";
import { authenticateToken, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  assignShiftBodySchema,
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../schemas/assignShiftSchema.js";

const router = Router();
router.use(authenticateToken);
router.use(authorize(["admin"]));

router.get("/", getDepartments);
router.post("/", validate(createDepartmentSchema), createDepartment);
router.get("/:id", getDepartmentById);
router.put("/:id", validate(updateDepartmentSchema), updateDepartment);

// Assign shift to department (ADMIN ONLY)
router.put(
  "/:id/shift",
  validate(assignShiftBodySchema),
  assignShiftToDepartment
);

export default router;
