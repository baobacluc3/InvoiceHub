import { ExportFormat, UserRole } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guards";
import { logActivity } from "@/lib/activity";
import { buildExportWhere, loadExportRecords, persistExportFile, renderExportContent } from "@/lib/export";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.role === UserRole.VIEWER) return new NextResponse("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const formatParam = url.searchParams.get("format") ?? ExportFormat.CSV;
  const format = formatParam === ExportFormat.JSON ? ExportFormat.JSON : ExportFormat.CSV;

  const where = buildExportWhere(
    {
      companyId: url.searchParams.get("company") ?? undefined,
      accountingPeriod: url.searchParams.get("period") ?? undefined,
      documentTypeId: url.searchParams.get("documentType") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      format,
    },
    { id: user.id, role: user.role },
  );

  const job = await prisma.exportJob.create({
    data: {
      companyId: typeof where.companyId === "string" ? where.companyId : undefined,
      requestedById: user.id,
      format,
      status: "PROCESSING",
    },
  });

  await logActivity({ userId: user.id, action: "EXPORT_CREATED", entityType: "EXPORT_JOB", entityId: job.id, metadata: { format } });

  const records = await loadExportRecords(where);
  const rendered = renderExportContent(records, format);
  const outputPath = await persistExportFile(rendered.content, job.id, rendered.extension);

  await prisma.exportJob.update({ where: { id: job.id }, data: { status: "READY", outputPath } });

  const fileBuffer = await readFile(outputPath);
  await logActivity({ userId: user.id, action: "EXPORT_DOWNLOADED", entityType: "EXPORT_JOB", entityId: job.id, metadata: { count: records.length } });

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": rendered.contentType,
      "Content-Disposition": `attachment; filename="approved-documents-${job.id}.${rendered.extension}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
