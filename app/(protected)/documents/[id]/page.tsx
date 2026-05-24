import Link from "next/link";
import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    include: { company: true, documentType: true, uploadedBy: true },
  });

  if (!document) notFound();
  if (user.role === UserRole.STAFF && document.uploadedById !== user.id) notFound();

  const previewUrl = `/api/documents/${document.id}/file`;
  const isImage = document.mimeType === "image/jpeg" || document.mimeType === "image/png";
  const isPdf = document.mimeType === "application/pdf";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Document Detail</h2>
        <p className="text-sm text-slate-600">ID: {document.id}</p>
      </div>

      <div className="rounded border bg-white p-4 text-sm">
        <p><strong>Original file:</strong> {document.originalFileName}</p>
        <p><strong>Company:</strong> {document.company.name}</p>
        <p><strong>Document type:</strong> {document.documentType.name}</p>
        <p><strong>Accounting period:</strong> {document.accountingPeriod}</p>
        <p><strong>Status:</strong> {document.status}</p>
        <p><strong>Uploaded by:</strong> {document.uploadedBy.email}</p>
        <p><strong>Uploaded at:</strong> {document.createdAt.toISOString()}</p>
        <p><strong>Notes:</strong> {document.notes || "-"}</p>
      </div>

      <div className="rounded border bg-white p-4">
        <h3 className="mb-3 font-medium">File preview</h3>
        {isImage ? <img src={previewUrl} alt={document.originalFileName} className="max-h-[500px] rounded border" /> : null}
        {isPdf ? <iframe src={previewUrl} title={document.originalFileName} className="h-[500px] w-full rounded border" /> : null}
        {!isImage && !isPdf ? <p className="text-sm text-slate-600">Preview is unavailable for this file type.</p> : null}
      </div>

      <div className="flex gap-2">
        <button className="cursor-not-allowed rounded border px-3 py-2 text-slate-400" disabled>Run OCR (placeholder)</button>
        <button className="cursor-not-allowed rounded border px-3 py-2 text-slate-400" disabled>Edit OCR (placeholder)</button>
        <Link className="cursor-not-allowed rounded border px-3 py-2 text-slate-400" href="#" aria-disabled>Submit for approval (placeholder)</Link>
      </div>
    </div>
  );
}
