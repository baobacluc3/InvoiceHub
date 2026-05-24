import Link from "next/link";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { runDocumentOcr } from "@/lib/ocr-workflow";

export default async function DocumentsPage() {
  const user = await requireAuth();
  const docs = await prisma.document.findMany({ include: { company: true, documentType: true }, orderBy: { createdAt: 'desc' } });

  async function runOcrAction(formData: FormData) {
    "use server";
    await runDocumentOcr(String(formData.get("documentId")), user.id, user.role);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Documents</h2>
      <div className="rounded border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-slate-50 text-left"><th className="p-2">File</th><th className="p-2">Company</th><th className="p-2">Type</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
          <tbody>{docs.map((doc) => <tr className="border-b" key={doc.id}><td className="p-2">{doc.fileName}</td><td className="p-2">{doc.company.name}</td><td className="p-2">{doc.documentType.name}</td><td className="p-2">{doc.status}</td><td className="p-2"><div className="flex gap-2"><form action={runOcrAction}><input type="hidden" name="documentId" value={doc.id} /><button className="rounded border px-2 py-1" type="submit">Run OCR</button></form><Link href={`/documents/${doc.id}/ocr`} className="rounded border px-2 py-1">OCR Page</Link></div></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
