import Link from "next/link";
import { DocumentStatus, Prisma, UserRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAuth();
  const params = await searchParams;
  const page = Number(getSearchParam(params.page) ?? "1");

  const where: Prisma.DocumentWhereInput = {
    ...(user.role === UserRole.STAFF ? { uploadedById: user.id } : {}),
    ...(getSearchParam(params.companyId) ? { companyId: getSearchParam(params.companyId) } : {}),
    ...(getSearchParam(params.documentTypeId) ? { documentTypeId: getSearchParam(params.documentTypeId) } : {}),
    ...(getSearchParam(params.status) ? { status: getSearchParam(params.status) as DocumentStatus } : {}),
    ...(getSearchParam(params.accountingPeriod)
      ? { accountingPeriod: getSearchParam(params.accountingPeriod) }
      : {}),
    ...(getSearchParam(params.uploadedById) ? { uploadedById: getSearchParam(params.uploadedById) } : {}),
    ...(getSearchParam(params.startDate) || getSearchParam(params.endDate)
      ? {
          createdAt: {
            ...(getSearchParam(params.startDate) ? { gte: new Date(getSearchParam(params.startDate) as string) } : {}),
            ...(getSearchParam(params.endDate) ? { lte: new Date(getSearchParam(params.endDate) as string) } : {}),
          },
        }
      : {}),
  };

  const [documents, totalCount, companies, documentTypes, uploaders] = await Promise.all([
    prisma.document.findMany({
      where,
      include: { company: true, documentType: true, uploadedBy: true },
      orderBy: { createdAt: "desc" },
      skip: (Math.max(page, 1) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.document.count({ where }),
    prisma.company.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.documentType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { email: "asc" }, select: { id: true, email: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Documents</h2>
      <form className="grid gap-3 rounded border bg-white p-4 md:grid-cols-4">
        <select name="companyId" defaultValue={getSearchParam(params.companyId) ?? ""} className="rounded border p-2"><option value="">All companies</option>{companies.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="documentTypeId" defaultValue={getSearchParam(params.documentTypeId) ?? ""} className="rounded border p-2"><option value="">All document types</option>{documentTypes.map((d)=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <select name="status" defaultValue={getSearchParam(params.status) ?? ""} className="rounded border p-2"><option value="">All statuses</option>{Object.values(DocumentStatus).map((s)=><option key={s} value={s}>{s}</option>)}</select>
        <input name="accountingPeriod" defaultValue={getSearchParam(params.accountingPeriod) ?? ""} placeholder="Accounting period (YYYY-MM)" className="rounded border p-2" />
        <select name="uploadedById" defaultValue={getSearchParam(params.uploadedById) ?? ""} className="rounded border p-2"><option value="">All uploaders</option>{uploaders.map((u)=><option key={u.id} value={u.id}>{u.email}</option>)}</select>
        <input type="date" name="startDate" defaultValue={getSearchParam(params.startDate) ?? ""} className="rounded border p-2" />
        <input type="date" name="endDate" defaultValue={getSearchParam(params.endDate) ?? ""} className="rounded border p-2" />
        <button className="rounded border bg-slate-900 px-3 py-2 text-white" type="submit">Apply filters</button>
      </form>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100"><tr><th className="p-2 text-left">Original file name</th><th className="p-2 text-left">Company</th><th className="p-2 text-left">Document type</th><th className="p-2 text-left">Accounting period</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Uploaded by</th><th className="p-2 text-left">Created At</th><th className="p-2 text-left">Actions</th></tr></thead>
          <tbody>
            {documents.map((doc) => (
              <tr className="border-t" key={doc.id}>
                <td className="p-2">{doc.originalFileName}</td><td className="p-2">{doc.company.name}</td><td className="p-2">{doc.documentType.name}</td><td className="p-2">{doc.accountingPeriod}</td><td className="p-2">{doc.status}</td><td className="p-2">{doc.uploadedBy.email}</td><td className="p-2">{doc.createdAt.toISOString().slice(0, 10)}</td><td className="p-2"><Link className="rounded border px-2 py-1" href={`/documents/${doc.id}`}>View</Link></td>
              </tr>
            ))}
            {documents.length === 0 ? <tr><td className="p-3" colSpan={8}>No documents found.</td></tr> : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <p>Page {Math.min(page, totalPages)} of {totalPages}</p>
        <div className="space-x-2">
          {page > 1 ? <Link className="rounded border px-2 py-1" href={`/documents?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k,v])=>[k, Array.isArray(v)?v[0]??"":v??""])), page: String(page - 1) }).toString()}`}>Previous</Link> : null}
          {page < totalPages ? <Link className="rounded border px-2 py-1" href={`/documents?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k,v])=>[k, Array.isArray(v)?v[0]??"":v??""])), page: String(page + 1) }).toString()}`}>Next</Link> : null}
        </div>
      </div>
    </div>
  );
}
