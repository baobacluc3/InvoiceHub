import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-guards";
import { getLogs } from "@/lib/logs";
import { prisma } from "@/lib/prisma";
import { logsFiltersSchema } from "@/lib/validators";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  if (user.role === UserRole.VIEWER) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const parsed = logsFiltersSchema.safeParse({
    user: typeof params.user === "string" ? params.user : undefined,
    action: typeof params.action === "string" ? params.action : undefined,
    entityType: typeof params.entityType === "string" ? params.entityType : undefined,
    from: typeof params.from === "string" ? params.from : undefined,
    to: typeof params.to === "string" ? params.to : undefined,
  });

  const filters = parsed.success ? parsed.data : {};
  const logs = await getLogs(
    {
      userId: filters.user,
      action: filters.action,
      entityType: filters.entityType,
      from: filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : undefined,
      to: filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined,
    },
    { role: user.role, userId: user.id },
  );

  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true }, orderBy: { email: "asc" } });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Activity Logs</h2>
      <form method="get" className="grid gap-3 rounded border bg-white p-4 md:grid-cols-5">
        <select className="rounded border px-2 py-1" name="user" defaultValue={filters.user ?? ""}>
          <option value="">All users</option>
          {users.map((entry) => (
            <option key={entry.id} value={entry.id}>{entry.name || entry.email}</option>
          ))}
        </select>
        <input className="rounded border px-2 py-1" name="action" placeholder="Action" defaultValue={filters.action} />
        <input className="rounded border px-2 py-1" name="entityType" placeholder="Entity type" defaultValue={filters.entityType} />
        <input className="rounded border px-2 py-1" type="date" name="from" defaultValue={filters.from} />
        <input className="rounded border px-2 py-1" type="date" name="to" defaultValue={filters.to} />
        <button className="rounded border bg-slate-50 px-3 py-1 md:col-span-5" type="submit">Apply filters</button>
      </form>

      <div className="overflow-x-auto rounded border bg-white p-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="border-b pb-1">createdAt</th><th className="border-b pb-1">user</th><th className="border-b pb-1">action</th>
              <th className="border-b pb-1">entityType</th><th className="border-b pb-1">entityId</th><th className="border-b pb-1">ipAddress</th>
              <th className="border-b pb-1">userAgent</th><th className="border-b pb-1">metadata summary</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td className="pt-2 text-slate-500" colSpan={8}>No activity logs found.</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id}>
                <td className="py-1">{log.createdAt.toISOString()}</td>
                <td className="py-1">{log.user?.name || log.user?.email || "System"}</td>
                <td className="py-1">{log.action}</td>
                <td className="py-1">{log.entityType}</td>
                <td className="py-1">{log.entityId ?? "-"}</td>
                <td className="py-1">{log.ipAddress ?? "-"}</td>
                <td className="py-1 max-w-40 truncate" title={log.userAgent ?? ""}>{log.userAgent ?? "-"}</td>
                <td className="py-1">{formatMetadata(log.metadata)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "-";
  const entries = Object.entries(metadata as Record<string, unknown>).slice(0, 3);
  if (entries.length === 0) return "-";
  return entries.map(([key, value]) => `${key}:${String(value)}`).join(" | ");
}
