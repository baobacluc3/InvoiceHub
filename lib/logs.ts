import { UserRole, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LogsFilters = {
  userId?: string;
  action?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
};

export type LogsScope = {
  role: UserRole;
  userId: string;
};

function buildWhere(filters: LogsFilters, scope: LogsScope): Prisma.ActivityLogWhereInput {
  const isManager = scope.role === UserRole.MANAGER;
  const isStaff = scope.role === UserRole.STAFF;

  return {
    userId: isStaff ? scope.userId : filters.userId,
    action: filters.action,
    entityType: isManager ? "DOCUMENT" : filters.entityType,
    createdAt: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
  };
}

export async function getLogs(filters: LogsFilters, scope: LogsScope) {
  const where = buildWhere(filters, scope);
  return prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });
}
