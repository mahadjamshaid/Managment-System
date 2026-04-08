import { z } from "zod";

export const paginationSchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  search: z.string().trim().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
