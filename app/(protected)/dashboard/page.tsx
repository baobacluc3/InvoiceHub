import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await requireAuth();
  const [totalDocuments, reviewQueue, approvedCount] = await Promise.all([
    prisma.document.count(),
    prisma.document.count({ where: { status: "OCR_REVIEW" } }),
    prisma.document.count({ where: { status: "APPROVED" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-600">Welcome back, {user.email}. Here is your current operations summary.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Total Documents", value: totalDocuments }, { label: "OCR Review Queue", value: reviewQueue }, { label: "Approved", value: approvedCount }, { label: "SLA Health", value: "On Track" }].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
