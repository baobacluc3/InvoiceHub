import { DocumentStatus, ExportFormat, Prisma, UserRole } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { exportFiltersSchema, exportOcrFieldsSchema } from "@/lib/validators";

export type ExportRecord = {
  companyName: string;
  companyTaxCode: string;
  documentType: string;
  accountingPeriod: string;
  invoiceNumber: string;
  invoiceSymbol: string;
  invoiceDate: string;
  sellerName: string;
  sellerTaxCode: string;
  buyerName: string;
  buyerTaxCode: string;
  subtotal: string;
  vatAmount: string;
  totalAmount: string;
  currency: string;
  documentId: string;
  originalFileName: string;
};

export function buildExportWhere(input: Record<string, string | undefined>, user: { id: string; role: UserRole }): Prisma.DocumentWhereInput {
  const parsed = exportFiltersSchema.parse(input);

  const where: Prisma.DocumentWhereInput = {
    status: DocumentStatus.APPROVED,
    companyId: parsed.companyId,
    accountingPeriod: parsed.accountingPeriod,
    documentTypeId: parsed.documentTypeId,
    createdAt:
      parsed.dateFrom || parsed.dateTo
        ? {
            gte: parsed.dateFrom ? new Date(`${parsed.dateFrom}T00:00:00.000Z`) : undefined,
            lte: parsed.dateTo ? new Date(`${parsed.dateTo}T23:59:59.999Z`) : undefined,
          }
        : undefined,
  };

  if (user.role === UserRole.STAFF) {
    where.uploadedById = user.id;
  }

  return where;
}

export async function loadExportRecords(where: Prisma.DocumentWhereInput): Promise<ExportRecord[]> {
  const documents = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { name: true, taxCode: true } },
      documentType: { select: { name: true } },
      ocrResults: { select: { fieldsJson: true }, orderBy: { updatedAt: "desc" }, take: 1 },
    },
    take: 5000,
  });

  return documents.map((document) => {
    const parsedOcr = exportOcrFieldsSchema.safeParse(document.ocrResults[0]?.fieldsJson ?? {});
    const fields = parsedOcr.success ? parsedOcr.data : {};

    return {
      companyName: document.company.name,
      companyTaxCode: document.company.taxCode,
      documentType: document.documentType.name,
      accountingPeriod: document.accountingPeriod,
      invoiceNumber: fields.invoiceNumber ?? "",
      invoiceSymbol: fields.invoiceSymbol ?? "",
      invoiceDate: fields.invoiceDate ?? "",
      sellerName: fields.sellerName ?? "",
      sellerTaxCode: fields.sellerTaxCode ?? "",
      buyerName: fields.buyerName ?? "",
      buyerTaxCode: fields.buyerTaxCode ?? "",
      subtotal: fields.subtotal ?? "",
      vatAmount: fields.vatAmount ?? "",
      totalAmount: fields.totalAmount ?? "",
      currency: fields.currency ?? "",
      documentId: document.id,
      originalFileName: document.originalFileName,
    };
  });
}

function csvEscape(value: string): string {
  const needsQuote = value.includes(",") || value.includes("\n") || value.includes('"');
  const escaped = value.replaceAll('"', '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

export function renderExportContent(records: ExportRecord[], format: ExportFormat): { content: string; contentType: string; extension: string } {
  if (format === ExportFormat.JSON) {
    return { content: JSON.stringify(records, null, 2), contentType: "application/json", extension: "json" };
  }

  const headers = Object.keys(records[0] ?? {
    companyName: "",
    companyTaxCode: "",
    documentType: "",
    accountingPeriod: "",
    invoiceNumber: "",
    invoiceSymbol: "",
    invoiceDate: "",
    sellerName: "",
    sellerTaxCode: "",
    buyerName: "",
    buyerTaxCode: "",
    subtotal: "",
    vatAmount: "",
    totalAmount: "",
    currency: "",
    documentId: "",
    originalFileName: "",
  });

  const rows = records.map((record) => headers.map((header) => csvEscape(String(record[header as keyof ExportRecord]))).join(","));
  return {
    content: [headers.join(","), ...rows].join("\n"),
    contentType: "text/csv; charset=utf-8",
    extension: "csv",
  };
}

export async function persistExportFile(content: string, exportJobId: string, extension: string): Promise<string> {
  const directory = path.join(process.cwd(), ".generated", "exports");
  await mkdir(directory, { recursive: true });
  const outputPath = path.join(directory, `${exportJobId}.${extension}`);
  await writeFile(outputPath, content, "utf8");
  return outputPath;
}
