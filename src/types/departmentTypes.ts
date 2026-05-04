import {z} from "zod"
import { 
    createDepartmentSchema,
    updateDepartmentSchema,
    assignShiftBodySchema,
    assignShiftSchema,
    departmentParamsSchema } from "../schemas/assignShiftSchema.js"

export type CreateDepartmentType = z.infer<typeof createDepartmentSchema>
export type UpdateDepartmentType = z.infer<typeof updateDepartmentSchema>
export type AssignShiftType = z.infer<typeof assignShiftSchema>
export type DepartmentParamsType = z.infer<typeof departmentParamsSchema>
export type AssignShiftBodyType = z.infer<typeof assignShiftBodySchema>

