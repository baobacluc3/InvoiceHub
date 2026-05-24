import { z } from "zod";

export const accountingPeriodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Accounting period must be formatted as YYYY-MM");

export const uploadDocumentSchema = z.object({
  companyId: z.string().cuid(),
  documentTypeId: z.string().cuid(),
  accountingPeriod: accountingPeriodSchema,
});

export const rejectDocumentSchema = z.object({
  note: z
    .string()
    .trim()
    .min(3, "Rejection reason must be at least 3 characters")
    .max(500, "Rejection reason must be 500 characters or fewer"),
});
