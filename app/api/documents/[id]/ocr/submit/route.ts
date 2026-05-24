import { DocumentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.document.update({ where: { id }, data: { status: DocumentStatus.SUBMITTED } });
  await logActivity({ userId: user.id, action: "DOCUMENT_SUBMITTED", entityType: "Document", entityId: id });
  return NextResponse.json({ success: true });
}
