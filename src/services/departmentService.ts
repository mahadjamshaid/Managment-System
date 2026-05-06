import { ApiError } from "../errors/ApiError.js";
import { departmentRepo } from "../db/repositories/departmentRepo.js";
import { normalizeName, buildShiftName } from "../utils/departmentUtils.js";
import { shiftRepo } from "../db/repositories/shiftRepo.js";
import { toDepartmentResponse } from "../dto/departmentDto.js";
import {
  CreateDepartmentType,
  UpdateDepartmentType,
  AssignShiftBodyType
} from "../types/departmentTypes.js";
import { db } from "../db/index.js";
import { getCurrentPKTTime } from "../utils/time.utils.js";

export const departmentService = {
  async getAllDepartments() {
    const rows = await departmentRepo.findAllDepartmentsWithShift(db);
    return rows.map((row) => toDepartmentResponse(row, row.assignedShift));
  },

  async getDepartmentById(id: number) {
    const data = await departmentRepo.findDepartmentByIdWithShift(id, db);

    if (!data) {
      throw new ApiError("DEPARTMENT_NOT_FOUND", "Department not found", 404);
    }

    return toDepartmentResponse(data, data.assignedShift);
  },

  async createDepartment(payload: CreateDepartmentType) {
    const normalizedName = normalizeName(payload.name);
    const shiftDisplayName = buildShiftName(normalizedName);

    return await db.transaction(async (tx) => {
      const existing = await departmentRepo.findDepartmentByName(normalizedName, tx);

      if (existing) {
        throw new ApiError(
          "DEPARTMENT_ALREADY_EXISTS",
          "Department already exists",
          409
        );
      }

      const createdShift = await shiftRepo.insertShift(
        {
          name: shiftDisplayName,
          startTime: payload.startTime,
          endTime: payload.endTime,
          graceMinutes: payload.graceMinutes,
          breakMinutes: payload.breakMinutes || 0,
        },
        tx
      );

      const createdDepartment = await departmentRepo.insertDepartment(
        {
          name: normalizedName,
          description: payload.description.trim(),
          shiftId: createdShift.id,
        },
        tx
      );

      return toDepartmentResponse(createdDepartment, createdShift);
    });
  },

  async updateDepartment(id: number, payload: UpdateDepartmentType) {
    return await db.transaction(async (tx) => {
      const dept = await departmentRepo.findDepartmentByIdBasic(id, tx);

      if (!dept) {
        throw new ApiError("DEPARTMENT_NOT_FOUND", "Department not found", 404);
      }

      let normalizedName: string | null = null;

      if (typeof payload.name === "string" && payload.name.trim().length > 0) {
        normalizedName = normalizeName(payload.name);

        const duplicate = await departmentRepo.findDepartmentByName(
          normalizedName,
          tx
        );

        if (duplicate && duplicate.id !== id) {
          throw new ApiError(
            "DEPARTMENT_EXISTS",
            "Department name already exists",
            409
          );
        }

        if (!dept.shiftId) {
          throw new ApiError("SHIFT_NOT_FOUND", "Department has no shift", 404);
        }

        await shiftRepo.updateShiftById(
          dept.shiftId,
          { name: buildShiftName(normalizedName), updatedAt: getCurrentPKTTime() },
          tx
        );
      }

      await departmentRepo.updateDepartmentById(
        id,
        {
          ...(normalizedName && { name: normalizedName }),
          ...(payload.description !== undefined && {
            description: payload.description.trim(),
          }),
          updatedAt: getCurrentPKTTime(),
        },
        tx
      );

      const updated = await departmentRepo.findDepartmentByIdWithShift(id, tx);

      if (!updated) {
        throw new ApiError("DEPARTMENT_NOT_FOUND", "Department not found", 404);
      }

      return toDepartmentResponse(updated, updated.assignedShift);
    });
  },

  async updateShiftForDepartment(id: number, payload: AssignShiftBodyType) {
    return await db.transaction(async (tx) => {
      const dept = await departmentRepo.findDepartmentByIdBasic(id, tx);

      if (!dept) {
        throw new ApiError("DEPARTMENT_NOT_FOUND", "Department not found", 404);
      }

      if (!dept.shiftId) {
        throw new ApiError(
          "SHIFT_NOT_FOUND",
          "Department has no shift assigned",
          404
        );
      }

      const updatedShift = await shiftRepo.updateShiftById(
        dept.shiftId,
        {
          startTime: payload.startTime,
          endTime: payload.endTime,
          graceMinutes: payload.graceMinutes,
          breakMinutes: payload.breakMinutes,
          updatedAt: getCurrentPKTTime(),
        },
        tx
      );

      if (!updatedShift) {
        throw new ApiError(
          "SHIFT_NOT_FOUND",
          "Assigned shift not found or could not be updated",
          404
        );
      }

      await departmentRepo.updateDepartmentById(
        id,
        { updatedAt: getCurrentPKTTime() },
        tx
      );

      const updatedDepartment = await departmentRepo.findDepartmentByIdWithShift(id, tx);

      if (!updatedDepartment) {
        throw new ApiError("DEPARTMENT_NOT_FOUND", "Department not found", 404);
      }

      return toDepartmentResponse(updatedDepartment, updatedDepartment.assignedShift);
    });
  },
};