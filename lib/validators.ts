import { z } from "zod";

export const accountingPeriodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Accounting period must be formatted as YYYY-MM");

export const uploadDocumentSchema = z.object({
  companyId: z.string().cuid(),
  documentTypeId: z.string().cuid(),
  accountingPeriod: accountingPeriodSchema,
  notes: z.string().trim().max(1000).optional(),
});
