import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guards";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { documentTypeSchema } from "@/lib/validators";

async function upsertDocumentTypeAction(formData: FormData) {"use server";
  const actor = await requireRole([UserRole.ADMIN]);
  const parsed = documentTypeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { id, status, ...values } = parsed.data;
  const data = { ...values, isActive: status === "ACTIVE" };
  if (id) {
    const updated = await prisma.documentType.update({ where: { id }, data });
    await logActivity({ userId: actor.id, action: "DOCUMENT_TYPE_UPDATED", entityType: "DOCUMENT_TYPE", entityId: id, metadata: data });
    if (!updated.isActive) await logActivity({ userId: actor.id, action: "DOCUMENT_TYPE_DISABLED", entityType: "DOCUMENT_TYPE", entityId: id });
  } else {
    const created = await prisma.documentType.create({ data });
    await logActivity({ userId: actor.id, action: "DOCUMENT_TYPE_CREATED", entityType: "DOCUMENT_TYPE", entityId: created.id, metadata: data });
  }
  revalidatePath("/admin/document-types");
}

export default async function DocumentTypesPage() {
  await requireRole([UserRole.ADMIN]);
  const documentTypes = await prisma.documentType.findMany({ orderBy: { createdAt: "desc" } });

  return <section className="space-y-4"><h2 className="text-2xl font-semibold">Document Types</h2>
    <form action={upsertDocumentTypeAction} className="grid grid-cols-5 gap-2 rounded border bg-white p-4"><input name="code" placeholder="Code" required className="rounded border px-2 py-1"/><input name="name" placeholder="Name" required className="rounded border px-2 py-1"/><input name="description" placeholder="Description" className="rounded border px-2 py-1"/><select name="status" className="rounded border px-2 py-1"><option>ACTIVE</option><option>DISABLED</option></select><button className="rounded bg-slate-900 px-2 text-white">Create type</button></form>
    <table className="w-full border-collapse border bg-white text-sm"><thead><tr className="bg-slate-100"><th className="border p-2 text-left">code</th><th className="border p-2 text-left">name</th><th className="border p-2 text-left">description</th><th className="border p-2 text-left">status</th><th className="border p-2 text-left">actions</th></tr></thead><tbody>{documentTypes.map((d)=><tr key={d.id}><td className="border p-2">{d.code}</td><td className="border p-2">{d.name}</td><td className="border p-2">{d.description}</td><td className="border p-2">{d.isActive?"ACTIVE":"DISABLED"}</td><td className="border p-2"><form action={upsertDocumentTypeAction} className="grid grid-cols-5 gap-2"><input type="hidden" name="id" value={d.id}/><input name="code" defaultValue={d.code} className="rounded border px-2 py-1" required/><input name="name" defaultValue={d.name} className="rounded border px-2 py-1" required/><input name="description" defaultValue={d.description ?? ""} className="rounded border px-2 py-1"/><select name="status" defaultValue={d.isActive?"ACTIVE":"DISABLED"} className="rounded border px-2 py-1"><option>ACTIVE</option><option>DISABLED</option></select><button className="rounded border px-2">Save</button></form></td></tr>)}</tbody></table>
  </section>;
}
