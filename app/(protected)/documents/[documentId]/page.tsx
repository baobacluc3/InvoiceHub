import { DocumentStatus, UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import { approveDocument, rejectDocument, reopenDocument, submitDocumentForApproval } from "@/lib/actions/document-review";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export default async function DocumentDetailPage({ params }: { params: Promise<{ documentId: string }> }) {
  const user = await requireAuth();
  const { documentId } = await params;
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      company: { select: { name: true } },
      documentType: { select: { name: true } },
      uploadedBy: { select: { email: true } },
      reviewLogs: { include: { reviewer: { select: { email: true, role: true } } }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!document) return notFound();
  if (user.role === UserRole.STAFF && document.uploadedById !== user.id) return notFound();

  const canSubmit =
    document.status === DocumentStatus.OCR_REVIEW &&
    ((user.role === UserRole.STAFF && document.uploadedById === user.id) ||
      user.role === UserRole.MANAGER ||
      user.role === UserRole.ADMIN);
  const canApproveOrReject =
    document.status === DocumentStatus.SUBMITTED && (user.role === UserRole.MANAGER || user.role === UserRole.ADMIN);
  const canReopen =
    document.status === DocumentStatus.REJECTED && user.role === UserRole.STAFF && document.uploadedById === user.id;

  return (
    <section className="space-y-6 rounded-lg border bg-white p-8">
      <div>
        <h2 className="text-2xl font-semibold">Document Review</h2>
        <p className="mt-2 text-slate-600">Approval workflow controls and review history.</p>
      </div>

      <div className="grid gap-2 text-sm">
        <p><span className="font-medium">File:</span> {document.fileName}</p>
        <p><span className="font-medium">Company:</span> {document.company.name}</p>
        <p><span className="font-medium">Type:</span> {document.documentType.name}</p>
        <p><span className="font-medium">Uploaded by:</span> {document.uploadedBy.email}</p>
        <p><span className="font-medium">Status:</span> {document.status}</p>
      </div>

      <div className="space-y-3 rounded border p-4">
        <h3 className="font-semibold">Review Actions</h3>
        {canSubmit ? (
          <form action={submitDocumentForApproval}>
            <input name="documentId" type="hidden" value={document.id} />
            <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Submit for approval</button>
          </form>
        ) : null}

        {canApproveOrReject ? (
          <div className="space-y-3">
            <form action={approveDocument}>
              <input name="documentId" type="hidden" value={document.id} />
              <button className="rounded bg-green-700 px-4 py-2 text-white" type="submit">Approve</button>
            </form>
            <form action={rejectDocument} className="space-y-2">
              <input name="documentId" type="hidden" value={document.id} />
              <label className="block text-sm font-medium" htmlFor="note">Reject with reason</label>
              <textarea className="w-full rounded border p-2" id="note" name="note" required rows={3} />
              <button className="rounded bg-red-700 px-4 py-2 text-white" type="submit">Reject</button>
            </form>
          </div>
        ) : null}

        {canReopen ? (
          <form action={reopenDocument}>
            <input name="documentId" type="hidden" value={document.id} />
            <button className="rounded border px-4 py-2" type="submit">Reopen rejected document</button>
          </form>
        ) : null}
      </div>

      <div className="space-y-3 rounded border p-4">
        <h3 className="font-semibold">Review History</h3>
        {document.reviewLogs.length === 0 ? <p className="text-sm text-slate-600">No review activity yet.</p> : null}
        <ul className="space-y-2 text-sm">
          {document.reviewLogs.map((log) => (
            <li className="rounded border p-2" key={log.id}>
              <p><span className="font-medium">{log.action}</span> by {log.reviewer.email} ({log.reviewer.role})</p>
              <p className="text-slate-600">{log.createdAt.toISOString()}</p>
              {log.note ? <p className="mt-1">Reason: {log.note}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
