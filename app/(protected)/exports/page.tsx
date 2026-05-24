import { ExportFormat, UserRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth-guards";
import { buildExportWhere } from "@/lib/export";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

function asSingle(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ExportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireAuth();
  const params = await searchParams;

  const [companies, documentTypes] = await Promise.all([
    prisma.company.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.documentType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const selectedFormat = asSingle(params.format) === ExportFormat.JSON ? ExportFormat.JSON : ExportFormat.CSV;

  const where = buildExportWhere(
    {
      companyId: asSingle(params.company),
      accountingPeriod: asSingle(params.period),
      documentTypeId: asSingle(params.documentType),
      dateFrom: asSingle(params.dateFrom),
      dateTo: asSingle(params.dateTo),
      format: selectedFormat,
    },
    { id: user.id, role: user.role },
  );

  const approvedCount = await prisma.document.count({ where });

  const canExport = user.role !== UserRole.VIEWER;

  return (
    <section className="rounded-lg border bg-white p-8">
      <h2 className="text-2xl font-semibold">Exports</h2>
      <p className="mt-2 text-slate-600">Download approved OCR documents in CSV or JSON.</p>

      <form className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3" method="get">
        <select className="rounded border p-2" defaultValue={asSingle(params.company) ?? ""} name="company">
          <option value="">All companies</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
        <input className="rounded border p-2" defaultValue={asSingle(params.period) ?? ""} name="period" placeholder="Accounting period YYYY-MM" />
        <select className="rounded border p-2" defaultValue={asSingle(params.documentType) ?? ""} name="documentType">
          <option value="">All document types</option>
          {documentTypes.map((documentType) => (
            <option key={documentType.id} value={documentType.id}>{documentType.name}</option>
          ))}
        </select>
        <input className="rounded border p-2" defaultValue={asSingle(params.dateFrom) ?? ""} name="dateFrom" type="date" />
        <input className="rounded border p-2" defaultValue={asSingle(params.dateTo) ?? ""} name="dateTo" type="date" />
        <select className="rounded border p-2" defaultValue={selectedFormat} name="format">
          <option value={ExportFormat.CSV}>CSV</option>
          <option value={ExportFormat.JSON}>JSON</option>
        </select>
        <button className="rounded border px-4 py-2" type="submit">Apply filters</button>
      </form>

      <div className="mt-6 rounded border bg-slate-50 p-4 text-sm">
        <p>Approved documents in scope: <strong>{approvedCount}</strong></p>
        <p className="text-slate-600">Only APPROVED documents are exportable by default.</p>
      </div>

      <div className="mt-6">
        {canExport ? (
          <a
            className="inline-flex rounded border bg-slate-900 px-4 py-2 text-white"
            href={`/api/exports/download?company=${encodeURIComponent(asSingle(params.company) ?? "")}&period=${encodeURIComponent(
              asSingle(params.period) ?? "",
            )}&documentType=${encodeURIComponent(asSingle(params.documentType) ?? "")}&dateFrom=${encodeURIComponent(
              asSingle(params.dateFrom) ?? "",
            )}&dateTo=${encodeURIComponent(asSingle(params.dateTo) ?? "")}&format=${selectedFormat}`}
          >
            Export approved documents
          </a>
        ) : (
          <p className="text-sm text-slate-600">Your role is read-only and cannot export documents.</p>
        )}
      </div>
    </section>
  );
}
