"use server";

import { DocumentStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { rejectDocumentSchema } from "@/lib/validators";

type ReviewAction = "SUBMITTED" | "APPROVED" | "REJECTED" | "REOPENED";

async function getDocumentOrThrow(documentId: string) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) throw new Error("Document not found");
  return document;
}

async function addReviewLog(params: {
  documentId: string;
  reviewerId: string;
  action: ReviewAction;
  note?: string;
}) {
  await prisma.reviewLog.create({
    data: {
      documentId: params.documentId,
      reviewerId: params.reviewerId,
      action: params.action,
      note: params.note,
    },
  });
}

function revalidateDocumentViews(documentId: string) {
  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
}

export async function submitDocumentForApproval(formData: FormData) {
  const user = await requireAuth();
  const documentId = String(formData.get("documentId") ?? "");
  const document = await getDocumentOrThrow(documentId);

  if (document.status !== DocumentStatus.OCR_REVIEW) throw new Error("Only OCR_REVIEW documents can be submitted");

  const canSubmitOwn = user.role === UserRole.STAFF && document.uploadedById === user.id;
  const canSubmitPrivileged = user.role === UserRole.MANAGER || user.role === UserRole.ADMIN;
  if (!canSubmitOwn && !canSubmitPrivileged) throw new Error("Not authorized to submit this document");

  await prisma.document.update({ where: { id: documentId }, data: { status: DocumentStatus.SUBMITTED } });
  await addReviewLog({ documentId, reviewerId: user.id, action: "SUBMITTED" });
  await logActivity({ userId: user.id, action: "DOCUMENT_SUBMITTED", entityType: "DOCUMENT", entityId: documentId });
  revalidateDocumentViews(documentId);
}

export async function approveDocument(formData: FormData) {
  const user = await requireAuth();
  if (user.role !== UserRole.MANAGER && user.role !== UserRole.ADMIN) throw new Error("Not authorized to approve documents");

  const documentId = String(formData.get("documentId") ?? "");
  const document = await getDocumentOrThrow(documentId);
  if (document.status !== DocumentStatus.SUBMITTED) throw new Error("Only SUBMITTED documents can be approved");

  await prisma.document.update({
    where: { id: documentId },
    data: { status: DocumentStatus.APPROVED, approvedAt: new Date(), approvedById: user.id },
  });
  await addReviewLog({ documentId, reviewerId: user.id, action: "APPROVED" });
  await logActivity({ userId: user.id, action: "DOCUMENT_APPROVED", entityType: "DOCUMENT", entityId: documentId });
  revalidateDocumentViews(documentId);
}

export async function rejectDocument(formData: FormData) {
  const user = await requireAuth();
  if (user.role !== UserRole.MANAGER && user.role !== UserRole.ADMIN) throw new Error("Not authorized to reject documents");

  const documentId = String(formData.get("documentId") ?? "");
  const parseResult = rejectDocumentSchema.safeParse({ note: formData.get("note") });
  if (!parseResult.success) throw new Error(parseResult.error.issues[0]?.message ?? "Invalid rejection reason");

  const document = await getDocumentOrThrow(documentId);
  if (document.status !== DocumentStatus.SUBMITTED) throw new Error("Only SUBMITTED documents can be rejected");

  await prisma.document.update({ where: { id: documentId }, data: { status: DocumentStatus.REJECTED, approvedAt: null, approvedById: null } });
  await addReviewLog({ documentId, reviewerId: user.id, action: "REJECTED", note: parseResult.data.note });
  await logActivity({
    userId: user.id,
    action: "DOCUMENT_REJECTED",
    entityType: "DOCUMENT",
    entityId: documentId,
    metadata: { note: parseResult.data.note },
  });
  revalidateDocumentViews(documentId);
}

export async function reopenDocument(formData: FormData) {
  const user = await requireAuth();
  const documentId = String(formData.get("documentId") ?? "");
  const document = await getDocumentOrThrow(documentId);

  if (document.status !== DocumentStatus.REJECTED) throw new Error("Only REJECTED documents can be reopened");
  const canReopenOwn = user.role === UserRole.STAFF && document.uploadedById === user.id;
  if (!canReopenOwn) throw new Error("Only STAFF owners can reopen rejected documents");

  await prisma.document.update({ where: { id: documentId }, data: { status: DocumentStatus.OCR_REVIEW } });
  await addReviewLog({ documentId, reviewerId: user.id, action: "REOPENED" });
  await logActivity({ userId: user.id, action: "DOCUMENT_REOPENED", entityType: "DOCUMENT", entityId: documentId });
  revalidateDocumentViews(documentId);
}
