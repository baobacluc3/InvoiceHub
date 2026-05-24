import Link from "next/link";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export default async function DocumentsPage() {
  const user = await requireAuth();

  const documents = await prisma.document.findMany({
    where: user.role === "STAFF" ? { uploadedById: user.id } : undefined,
    orderBy: { createdAt: "desc" },
    include: { company: { select: { name: true } }, documentType: { select: { name: true } } },
    take: 50,
  });

  return (
    <section className="rounded-lg border bg-white p-8">
      <h2 className="text-2xl font-semibold">Documents</h2>
      <p className="mt-2 text-slate-600">Approval workflow listing and status overview.</p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">File</th>
              <th className="py-2">Company</th>
              <th className="py-2">Type</th>
              <th className="py-2">Status</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr className="border-b" key={document.id}>
                <td className="py-2">{document.fileName}</td>
                <td className="py-2">{document.company.name}</td>
                <td className="py-2">{document.documentType.name}</td>
                <td className="py-2">{document.status}</td>
                <td className="py-2">
                  <Link className="rounded border px-2 py-1" href={`/documents/${document.id}`}>
                    View details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
