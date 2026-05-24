import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { updateOcrResultSchema } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id } = await params;
  const parsed = updateOcrResultSchema.safeParse({ ...body, documentId: id });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.ocrResult.findFirst({ where: { documentId: id }, orderBy: { createdAt: 'desc' } });
  if (!existing) return NextResponse.json({ error: "OCR result not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.ocrLineItem.deleteMany({ where: { ocrResultId: existing.id } });
    await tx.ocrResult.update({
      where: { id: existing.id },
      data: {
        fieldsJson: parsed.data.fields,
        lineItems: { create: parsed.data.lineItems },
      },
    });
  });

  await logActivity({ userId: user.id, action: "OCR_RESULT_UPDATED", entityType: "Document", entityId: id });
  return NextResponse.json({ success: true });
}
