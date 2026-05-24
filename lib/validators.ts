import { UserRole, UserStatus } from "@prisma/client";
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

export const createUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
});

export const updateUserSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
});

export const updateUserRoleSchema = z.object({
  id: z.string().cuid(),
  role: z.nativeEnum(UserRole),
});

export const updateUserStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(UserStatus),
});

export const companySchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1).max(180),
  taxCode: z.string().min(1).max(64),
  address: z.string().min(1).max(500),
  status: z.enum(["ACTIVE", "DISABLED"]),
});

export const documentTypeSchema = z.object({
  id: z.string().cuid().optional(),
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(180),
  description: z.string().max(500).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]),
});
