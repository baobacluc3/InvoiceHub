import { z } from "zod";

export const accountingPeriodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Accounting period must be formatted as YYYY-MM");

export const uploadDocumentSchema = z.object({
  companyId: z.string().cuid(),
  documentTypeId: z.string().cuid(),
  accountingPeriod: accountingPeriodSchema,
});

export const ocrFieldsSchema = z.object({
  invoiceNumber: z.string().min(1),
  invoiceSymbol: z.string().min(1),
  invoiceDate: z.string().min(1),
  sellerName: z.string().min(1),
  sellerTaxCode: z.string().min(1),
  sellerAddress: z.string().min(1),
  buyerName: z.string().min(1),
  buyerTaxCode: z.string().min(1),
  buyerAddress: z.string().min(1),
  subtotal: z.string().min(1),
  vatAmount: z.string().min(1),
  totalAmount: z.string().min(1),
  currency: z.string().min(1),
});

export const ocrLineItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
});

export const updateOcrResultSchema = z.object({
  documentId: z.string().cuid(),
  fields: ocrFieldsSchema,
  lineItems: z.array(ocrLineItemSchema),
});
