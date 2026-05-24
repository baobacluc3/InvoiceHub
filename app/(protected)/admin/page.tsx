import Link from "next/link";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth-guards";

export default async function AdminPage() {
  await requireRole([UserRole.ADMIN]);

  return (
    <section className="space-y-4 rounded-lg border bg-white p-8">
      <h2 className="text-2xl font-semibold">Admin</h2>
      <p className="text-slate-600">Manage users and master data.</p>
      <ul className="list-inside list-disc space-y-1">
        <li><Link className="text-blue-700 underline" href="/admin/users">/admin/users</Link></li>
        <li><Link className="text-blue-700 underline" href="/admin/document-types">/admin/document-types</Link></li>
      </ul>
    </section>
  );
}
