import { DocumentStatus } from "@prisma/client";

const statusStyles: Record<DocumentStatus, string> = {
  UPLOADED: "bg-slate-100 text-slate-700 ring-slate-200",
  OCR_PENDING: "bg-blue-50 text-blue-700 ring-blue-200",
  OCR_PROCESSING: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  OCR_REVIEW: "bg-amber-50 text-amber-700 ring-amber-200",
  SUBMITTED: "bg-purple-50 text-purple-700 ring-purple-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
  ERROR: "bg-red-50 text-red-700 ring-red-200",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]}`}>{status}</span>;
}
