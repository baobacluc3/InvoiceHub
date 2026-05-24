import { DocumentStatus, UserRole, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type DashboardFilters = {
  from?: Date;
  to?: Date;
  companyId?: string;
  accountingPeriod?: string;
};

export type DashboardScope = {
  role: UserRole;
  userId: string;
};

type DateWhere = { gte?: Date; lte?: Date };

function buildDateWhere(filters: DashboardFilters): DateWhere | undefined {
  if (!filters.from && !filters.to) return undefined;
  return {
    gte: filters.from,
    lte: filters.to,
  };
}

function buildDocumentWhere(filters: DashboardFilters, scope: DashboardScope): Prisma.DocumentWhereInput {
  return {
    companyId: filters.companyId,
    accountingPeriod: filters.accountingPeriod,
    createdAt: buildDateWhere(filters),
    ...(scope.role === UserRole.STAFF ? { uploadedById: scope.userId } : {}),
  };
}

export async function getDashboardData(filters: DashboardFilters, scope: DashboardScope) {
  const docWhere = buildDocumentWhere(filters, scope);
  const [
    totalDocuments,
    waitingForReview,
    submittedForApproval,
    approved,
    rejected,
    ocrErrors,
    byStatus,
    byCompany,
    byUser,
    documents,
  ] = await Promise.all([
    prisma.document.count({ where: docWhere }),
    prisma.document.count({ where: { ...docWhere, status: DocumentStatus.OCR_REVIEW } }),
    prisma.document.count({ where: { ...docWhere, status: DocumentStatus.SUBMITTED } }),
    prisma.document.count({ where: { ...docWhere, status: DocumentStatus.APPROVED } }),
    prisma.document.count({ where: { ...docWhere, status: DocumentStatus.REJECTED } }),
    prisma.document.count({ where: { ...docWhere, status: DocumentStatus.ERROR } }),
    prisma.document.groupBy({ by: ["status"], where: docWhere, _count: { _all: true }, orderBy: { status: "asc" } }),
    prisma.document.groupBy({ by: ["companyId"], where: docWhere, _count: { _all: true }, orderBy: { _count: { companyId: "desc" } } }),
    prisma.document.groupBy({ by: ["uploadedById", "status"], where: docWhere, _count: { _all: true } }),
    prisma.document.findMany({
      where: docWhere,
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const companyMap = new Map(
    (
      await prisma.company.findMany({
        where: { id: { in: byCompany.map((item) => item.companyId) } },
        select: { id: true, name: true },
      })
    ).map((company) => [company.id, company.name]),
  );

  const userMap = new Map(
    (
      await prisma.user.findMany({
        where: { id: { in: byUser.map((item) => item.uploadedById) } },
        select: { id: true, name: true, email: true },
      })
    ).map((user) => [user.id, user.name || user.email]),
  );

  const uploadsPerDay = documents.reduce<Record<string, number>>((acc, doc) => {
    const day = doc.createdAt.toISOString().slice(0, 10);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});

  const productivity = byUser.reduce<Record<string, { uploaded: number; submitted: number; approved: number }>>((acc, item) => {
    const row = (acc[item.uploadedById] ??= { uploaded: 0, submitted: 0, approved: 0 });
    row.uploaded += item._count._all;
    if (item.status === DocumentStatus.SUBMITTED) row.submitted += item._count._all;
    if (item.status === DocumentStatus.APPROVED) row.approved += item._count._all;
    return acc;
  }, {});

  return {
    stats: { totalDocuments, waitingForReview, submittedForApproval, approved, rejected, ocrErrors },
    byStatus: byStatus.map((item) => ({ status: item.status, count: item._count._all })),
    byCompany: byCompany.map((item) => ({ company: companyMap.get(item.companyId) ?? item.companyId, count: item._count._all })),
    uploadsPerDay: Object.entries(uploadsPerDay)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    productivity: Object.entries(productivity)
      .map(([userId, counts]) => ({ user: userMap.get(userId) ?? userId, ...counts }))
      .sort((a, b) => b.uploaded - a.uploaded),
  };
}
