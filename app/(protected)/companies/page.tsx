import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth-guards";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { companySchema } from "@/lib/validators";

async function upsertCompanyAction(formData: FormData) {"use server";
  const actor = await requireRole([UserRole.ADMIN]);
  const parsed = companySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { id, status, ...values } = parsed.data;
  const data = { ...values, isActive: status === "ACTIVE" };
  if (id) {
    const updated = await prisma.company.update({ where: { id }, data });
    await logActivity({ userId: actor.id, action: "COMPANY_UPDATED", entityType: "COMPANY", entityId: id, metadata: data });
    if (!updated.isActive) await logActivity({ userId: actor.id, action: "COMPANY_DISABLED", entityType: "COMPANY", entityId: id });
  } else {
    const created = await prisma.company.create({ data });
    await logActivity({ userId: actor.id, action: "COMPANY_CREATED", entityType: "COMPANY", entityId: created.id, metadata: data });
  }
  revalidatePath("/companies");
}

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireAuth();
  const canManage = user.role === UserRole.ADMIN;
  const q = (await searchParams).q?.trim() ?? "";

  const companies = await prisma.company.findMany({
    where: {
      ...(canManage ? {} : { isActive: true }),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { taxCode: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return <section className="space-y-4"><h2 className="text-2xl font-semibold">Companies</h2>
    <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search by company name or tax code" className="w-96 rounded border px-3 py-2"/><button className="rounded border px-3">Search</button></form>
    {canManage && <form action={upsertCompanyAction} className="grid grid-cols-5 gap-2 rounded border bg-white p-4"><input name="name" placeholder="Name" required className="rounded border px-2 py-1"/><input name="taxCode" placeholder="Tax code" required className="rounded border px-2 py-1"/><input name="address" placeholder="Address" required className="rounded border px-2 py-1"/><select name="status" className="rounded border px-2 py-1"><option>ACTIVE</option><option>DISABLED</option></select><button className="rounded bg-slate-900 px-2 text-white" type="submit">Create company</button></form>}
    <table className="w-full border-collapse border bg-white text-sm"><thead><tr className="bg-slate-100"><th className="border p-2 text-left">name</th><th className="border p-2 text-left">taxCode</th><th className="border p-2 text-left">address</th><th className="border p-2 text-left">status</th><th className="border p-2 text-left">actions</th></tr></thead><tbody>{companies.map((c)=><tr key={c.id}><td className="border p-2">{c.name}</td><td className="border p-2">{c.taxCode}</td><td className="border p-2">{c.address}</td><td className="border p-2">{c.isActive?"ACTIVE":"DISABLED"}</td><td className="border p-2">{canManage && <form action={upsertCompanyAction} className="grid grid-cols-5 gap-2"><input type="hidden" name="id" value={c.id}/><input name="name" defaultValue={c.name} className="rounded border px-2 py-1" required/><input name="taxCode" defaultValue={c.taxCode} className="rounded border px-2 py-1" required/><input name="address" defaultValue={c.address} className="rounded border px-2 py-1" required/><select name="status" defaultValue={c.isActive?"ACTIVE":"DISABLED"} className="rounded border px-2 py-1"><option>ACTIVE</option><option>DISABLED</option></select><button className="rounded border px-2" type="submit">Save</button></form>}</td></tr>)}</tbody></table>
  </section>;
}
