import { z } from "zod";

export const updateAttendanceSchema = z.object({
    checkInTime: z.string().datetime().optional(),
    checkOutTime: z.string().datetime().optional(),
    date: z.string().optional(),
    status: z.enum(["Absent", "OnLeave"]).optional(),
})

    .refine((data) => {
        // must update something meaningful
        return data.checkInTime || data.checkOutTime || data.status;
    }, {
        message: "At least one valid field must be updated"
    })

    .refine((data) => {
        // time consistency check
        if (data.checkInTime && data.checkOutTime) {
            return new Date(data.checkOutTime) > new Date(data.checkInTime);
        }
        return true;
    }, {
        message: "checkOutTime must be after checkInTime"
    })

    .refine((data) => {
        // prevent future timestamps
        const now = new Date();

        if (data.checkInTime && new Date(data.checkInTime) > now) return false;
        if (data.checkOutTime && new Date(data.checkOutTime) > now) return false;

        return true;
    }, {
        message: "Attendance times cannot be in the future"
    });