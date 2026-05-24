import { UserRole, UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guards";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { createUserSchema, updateUserRoleSchema, updateUserSchema, updateUserStatusSchema } from "@/lib/validators";

async function createUserAction(formData: FormData) {"use server";
  const actor = await requireRole([UserRole.ADMIN]);
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const user = await prisma.user.create({ data: parsed.data });
  await logActivity({ userId: actor.id, action: "USER_CREATED", entityType: "USER", entityId: user.id, metadata: parsed.data });
  revalidatePath("/admin/users");
}
async function updateUserAction(formData: FormData) {"use server";
  const actor = await requireRole([UserRole.ADMIN]);
  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { id, ...data } = parsed.data;
  await prisma.user.update({ where: { id }, data });
  await logActivity({ userId: actor.id, action: "USER_UPDATED", entityType: "USER", entityId: id, metadata: data });
  revalidatePath("/admin/users");
}
async function updateRoleAction(formData: FormData) {"use server";
  const actor = await requireRole([UserRole.ADMIN]);
  const parsed = updateUserRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await prisma.user.update({ where: { id: parsed.data.id }, data: { role: parsed.data.role } });
  await logActivity({ userId: actor.id, action: "USER_ROLE_CHANGED", entityType: "USER", entityId: parsed.data.id, metadata: { role: parsed.data.role } });
  revalidatePath("/admin/users");
}
async function updateStatusAction(formData: FormData) {"use server";
  const actor = await requireRole([UserRole.ADMIN]);
  const parsed = updateUserStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await prisma.user.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  await logActivity({ userId: actor.id, action: parsed.data.status === UserStatus.DISABLED ? "USER_DISABLED" : "USER_ENABLED", entityType: "USER", entityId: parsed.data.id, metadata: { status: parsed.data.status } });
  revalidatePath("/admin/users");
}


async function resetUserAccessAction(formData: FormData) {"use server";
  const actor = await requireRole([UserRole.ADMIN]);
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.account.deleteMany({ where: { userId: id } });
  });

  await logActivity({
    userId: actor.id,
    action: "USER_ACCESS_RESET",
    entityType: "USER",
    entityId: id,
    metadata: { reset: "sessions-and-linked-google-account" },
  });

  revalidatePath("/admin/users");
}

export default async function AdminUsersPage() {
  await requireRole([UserRole.ADMIN]);
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return <section className="space-y-6"><h2 className="text-2xl font-semibold">Admin User Management</h2><p className="text-sm text-slate-600">For Google SSO users, “Reset access” will sign out all sessions and require re-linking Google on next login.</p>
    <form action={createUserAction} className="grid grid-cols-5 gap-2 rounded border bg-white p-4">
      <input name="name" placeholder="Name" className="rounded border px-2 py-1" required />
      <input name="email" type="email" placeholder="Email" className="rounded border px-2 py-1" required />
      <select name="role" className="rounded border px-2 py-1">{Object.values(UserRole).map((role)=><option key={role}>{role}</option>)}</select>
      <select name="status" className="rounded border px-2 py-1">{Object.values(UserStatus).map((status)=><option key={status}>{status}</option>)}</select>
      <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-white">Create user</button>
    </form>
    <table className="w-full border-collapse border bg-white text-sm"><thead><tr className="bg-slate-100 text-left"><th className="border p-2">name</th><th className="border p-2">email</th><th className="border p-2">role</th><th className="border p-2">status</th><th className="border p-2">createdAt</th><th className="border p-2">actions</th></tr></thead>
      <tbody>{users.map((u)=><tr key={u.id}><td className="border p-2">{u.name}</td><td className="border p-2">{u.email}</td><td className="border p-2">{u.role}</td><td className="border p-2">{u.status}</td><td className="border p-2">{u.createdAt.toISOString()}</td><td className="border p-2 space-y-2">
        <form action={updateRoleAction} className="flex gap-2"><input type="hidden" name="id" value={u.id}/><select name="role" defaultValue={u.role} className="rounded border px-2 py-1">{Object.values(UserRole).map((r)=><option key={r}>{r}</option>)}</select><button className="rounded border px-2" type="submit">Change role</button></form>
        <form action={updateStatusAction} className="flex gap-2"><input type="hidden" name="id" value={u.id}/><input type="hidden" name="status" value={u.status===UserStatus.ACTIVE?UserStatus.DISABLED:UserStatus.ACTIVE}/><button className="rounded border px-2" type="submit">{u.status===UserStatus.ACTIVE?"Disable":"Enable"}</button></form>
        <form action={updateUserAction} className="grid grid-cols-4 gap-2"><input type="hidden" name="id" value={u.id}/><input name="name" defaultValue={u.name ?? ""} className="rounded border px-2 py-1" required/><input name="email" defaultValue={u.email} type="email" className="rounded border px-2 py-1" required/><select name="role" defaultValue={u.role} className="rounded border px-2 py-1">{Object.values(UserRole).map((r)=><option key={r}>{r}</option>)}</select><select name="status" defaultValue={u.status} className="rounded border px-2 py-1">{Object.values(UserStatus).map((s)=><option key={s}>{s}</option>)}</select><button type="submit" className="rounded border px-2">Update info</button></form>
        <form action={resetUserAccessAction} className="flex gap-2"><input type="hidden" name="id" value={u.id}/><button className="rounded border px-2" type="submit">Reset access</button></form>
      </td></tr>)}</tbody></table>
  </section>;
}
