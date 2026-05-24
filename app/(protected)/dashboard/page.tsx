import { UserRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth-guards";
import { getDashboardData } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";
import { dashboardFiltersSchema } from "@/lib/validators";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const parsed = dashboardFiltersSchema.safeParse({
    from: typeof params.from === "string" ? params.from : undefined,
    to: typeof params.to === "string" ? params.to : undefined,
    company: typeof params.company === "string" ? params.company : undefined,
    accountingPeriod: typeof params.accountingPeriod === "string" ? params.accountingPeriod : undefined,
  });

  const filters = parsed.success ? parsed.data : {};
  const data = await getDashboardData(
    {
      from: filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : undefined,
      to: filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined,
      companyId: filters.company,
      accountingPeriod: filters.accountingPeriod,
    },
    { role: user.role, userId: user.id },
  );

  const companies = await prisma.company.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard Statistics</h2>
      <form className="grid gap-3 rounded border bg-white p-4 md:grid-cols-4" method="get">
        <input className="rounded border px-2 py-1" type="date" name="from" defaultValue={filters.from} />
        <input className="rounded border px-2 py-1" type="date" name="to" defaultValue={filters.to} />
        <select className="rounded border px-2 py-1" name="company" defaultValue={filters.company ?? ""}>
          <option value="">All companies</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
        <input className="rounded border px-2 py-1" placeholder="YYYY-MM" name="accountingPeriod" defaultValue={filters.accountingPeriod} />
        <button className="rounded border bg-slate-50 px-3 py-1 md:col-span-4" type="submit">Apply filters</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Total documents uploaded", data.stats.totalDocuments],
          ["Documents waiting for OCR review", data.stats.waitingForReview],
          ["Documents submitted for approval", data.stats.submittedForApproval],
          ["Documents approved", data.stats.approved],
          ["Documents rejected", data.stats.rejected],
          ["OCR error count", data.stats.ocrErrors],
        ].map(([label, value]) => (
          <article className="rounded border bg-white p-4" key={label}>
            <p className="text-sm text-slate-600">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <SimpleTable title="Documents by status" columns={["Status", "Count"]} rows={data.byStatus.map((item) => [item.status, item.count.toString()])} />
        <SimpleTable title="Documents by company" columns={["Company", "Count"]} rows={data.byCompany.map((item) => [item.company, item.count.toString()])} />
        <SimpleTable title="Uploads in last 30 days" columns={["Date", "Count"]} rows={data.uploadsPerDay.map((item) => [item.day, item.count.toString()])} />
        <SimpleTable
          title={`Productivity by user${user.role === UserRole.STAFF ? " (self)" : ""}`}
          columns={["User", "Uploaded", "Submitted", "Approved"]}
          rows={data.productivity.map((item) => [item.user, item.uploaded.toString(), item.submitted.toString(), item.approved.toString()])}
        />
      </section>
    </div>
  );
}

function SimpleTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return (
    <div className="rounded border bg-white p-4">
      <h3 className="mb-2 font-medium">{title}</h3>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>{columns.map((column) => <th className="border-b pb-1" key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="pt-2 text-slate-500" colSpan={columns.length}>No data</td></tr>
          ) : rows.map((row, rowIdx) => (
            <tr key={`${title}-${rowIdx}`}>{row.map((cell, cellIdx) => <td className="py-1" key={`${rowIdx}-${cellIdx}`}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
