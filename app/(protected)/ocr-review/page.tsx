import Link from "next/link";
import { DocumentStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";

type Params = { [key: string]: string | string[] | undefined };

export default async function OcrReviewPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAuth();
  const filters = await searchParams;
  const company = typeof filters.company === "string" ? filters.company : undefined;
  const documentType = typeof filters.documentType === "string" ? filters.documentType : undefined;
  const period = typeof filters.accountingPeriod === "string" ? filters.accountingPeriod : undefined;
  const uploadedBy = typeof filters.uploadedBy === "string" ? filters.uploadedBy : undefined;

  const [companies, types, users, docs] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.documentType.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { email: "asc" } }),
    prisma.document.findMany({ where: { status: DocumentStatus.OCR_REVIEW, ...(company ? { companyId: company } : {}), ...(documentType ? { documentTypeId: documentType } : {}), ...(period ? { accountingPeriod: period } : {}), ...(uploadedBy ? { uploadedById: uploadedBy } : {}) }, include: { company: true, documentType: true, uploadedBy: true }, orderBy: { updatedAt: "desc" } }),
  ]);

  return <div className="space-y-4"><h2 className="text-2xl font-semibold">OCR Review Queue</h2>
    <form className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
      <select name="company" defaultValue={company} className="rounded-lg border p-2"><option value="">All companies</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select name="documentType" defaultValue={documentType} className="rounded-lg border p-2"><option value="">All document types</option>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <input name="accountingPeriod" defaultValue={period} placeholder="YYYY-MM" className="rounded-lg border p-2" />
      <select name="uploadedBy" defaultValue={uploadedBy} className="rounded-lg border p-2"><option value="">All uploaders</option>{users.map(u=><option key={u.id} value={u.id}>{u.email}</option>)}</select>
      <button className="col-span-full rounded-lg bg-slate-900 px-4 py-2 text-white" type="submit">Apply filters</button>
    </form>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-3">File</th><th className="p-3">Company</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Period</th><th className="p-3">Uploader</th><th className="p-3"></th></tr></thead>
        <tbody>{docs.length === 0 ? <tr><td className="p-8 text-center text-slate-500" colSpan={7}>No OCR review items found.</td></tr> : docs.map(d=><tr key={d.id} className="border-b"><td className="p-3">{d.fileName}</td><td className="p-3">{d.company.name}</td><td className="p-3">{d.documentType.name}</td><td className="p-3"><StatusBadge status={d.status} /></td><td className="p-3">{d.accountingPeriod}</td><td className="p-3">{d.uploadedBy.email}</td><td className="p-3"><Link className="rounded-lg border px-3 py-1.5" href={`/documents/${d.id}/ocr`}>Review</Link></td></tr>)}</tbody></table></div></div>;
}
