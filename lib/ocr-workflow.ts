import { DocumentStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOcrProvider } from "@/lib/ocr";
import { logActivity } from "@/lib/activity";

function canRunOcr(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.MANAGER || role === UserRole.STAFF;
}

export async function runDocumentOcr(documentId: string, actorId: string, actorRole: UserRole) {
  if (!canRunOcr(actorRole)) {
    throw new Error("You do not have permission to run OCR for this document.");
  }

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) throw new Error("Document not found.");

  await prisma.document.update({ where: { id: documentId }, data: { status: DocumentStatus.OCR_PROCESSING } });
  await logActivity({ userId: actorId, action: "OCR_STARTED", entityType: "Document", entityId: documentId });

  try {
    const provider = getOcrProvider();
    const result = await provider.extractTextFromDocument(document);

    await prisma.$transaction(async (tx) => {
      await tx.ocrResult.deleteMany({ where: { documentId } });

      const created = await tx.ocrResult.create({
        data: {
          documentId,
          rawText: result.rawText,
          confidenceScore: result.confidenceScore,
          fieldsJson: result.fields as unknown as Prisma.InputJsonValue,
          rawJson: result.rawJson as unknown as Prisma.InputJsonValue,
          lineItems: {
            create: result.lineItems.map((item) => ({
              label: item.label,
              value: item.value,
              confidence: item.confidence,
            })),
          },
        },
      });

      await tx.document.update({ where: { id: documentId }, data: { status: DocumentStatus.OCR_REVIEW } });
      await tx.activityLog.create({
        data: {
          userId: actorId,
          action: "OCR_COMPLETED",
          entityType: "Document",
          entityId: documentId,
          metadata: { ocrResultId: created.id } as Prisma.InputJsonValue,
        },
      });
    });
  } catch (error) {
    await prisma.document.update({ where: { id: documentId }, data: { status: DocumentStatus.ERROR } });
    await logActivity({
      userId: actorId,
      action: "OCR_FAILED",
      entityType: "Document",
      entityId: documentId,
      metadata: { message: error instanceof Error ? error.message : "Unknown OCR error" },
    });
    throw error;
  }
}
