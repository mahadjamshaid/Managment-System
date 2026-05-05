import { z } from "zod";
import { analyzeShiftTiming } from "../utils/shiftRules.js";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm time format");

const optionalTimeSchema = z.preprocess(
  (value) => value === "" || value === undefined ? undefined : value,
  timeSchema.optional().nullable()
);

const rawShiftTimingSchema = z.object({
  startTime: timeSchema,
  endTime: timeSchema,
  graceMinutes: z.coerce.number().int().min(0).max(240),
  breakMinutes: z.coerce.number().int().min(0).max(120),
});

const applyShiftTimingRules = (
  data: z.infer<typeof rawShiftTimingSchema>,
  ctx: z.RefinementCtx
) => {
  const result = analyzeShiftTiming(data);

  for (const error of result.errors) {
    ctx.addIssue({
      code: "custom",
      path: error.path === "duration" ? ["endTime"] : [error.path],
      message: error.message,
    });
  }
};

const shiftTimingSchema = rawShiftTimingSchema.superRefine(applyShiftTimingRules);

export const departmentParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "Department ID must be a number"),
});

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, "Department name must be at least 2 characters").max(255),
  description: z.string().trim().min(2, "Description must be at least 2 characters").max(255),
}).merge(rawShiftTimingSchema).superRefine(applyShiftTimingRules);

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  description: z.string().trim().min(2).max(255).optional(),
}).superRefine((data, ctx) => {
  if (data.name === undefined && data.description === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["name"],
      message: "Provide department name or description to update",
    });
  }
});

export const assignShiftBodySchema = shiftTimingSchema;

export const assignShiftSchema = z.object({
  params: departmentParamsSchema,
  body: assignShiftBodySchema,
});