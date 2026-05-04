import { Request, Response, NextFunction } from "express";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  assignShiftSchema,
  departmentParamsSchema
} from "../schemas/assignShiftSchema.js";
import { ApiError } from "../errors/ApiError.js";
import { departmentService } from "../services/departmentService.js";

export const getDepartments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await departmentService.getAllDepartments();

    return res.status(200).json({
      success: true,
      message: "Departments fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentById = async (req: Request, res: Response, next: NextFunction) => {
  const parsed = departmentParamsSchema.safeParse(req.params);

  try {
    if (!parsed.success) {
      throw new ApiError(
        "INVALID_PARAMS",
        "Invalid department ID",
        400
      );
    }

    const departmentId = Number(parsed.data.id);
    const data = await departmentService.getDepartmentById(departmentId);

    return res.status(200).json({
      success: true,
      message: "Department fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
  const parsed = createDepartmentSchema.safeParse(req.body);

  try {
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Validation failed",
        400
      );
    }

    const result = await departmentService.createDepartment(parsed.data);

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
  const params = departmentParamsSchema.safeParse(req.params);
  const parsed = updateDepartmentSchema.safeParse(req.body);

  try {
    if (!params.success) {
      throw new ApiError(
        "INVALID_PARAMS",
        "Invalid department ID",
        400
      );
    }

    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Validation failed",
        400
      );
    }

    const departmentId = Number(params.data.id);
    const result = await departmentService.updateDepartment(departmentId, parsed.data);

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const assignShiftToDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = assignShiftSchema.safeParse({
      params: req.params,
      body: req.body,
    });

    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Invalid shift assignment data",
        400
      );
    }

    const departmentId = Number(parsed.data.params.id);
    const result = await departmentService.updateShiftForDepartment(departmentId, parsed.data.body);

    return res.status(200).json({
      success: true,
      message: "Shift assigned successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
