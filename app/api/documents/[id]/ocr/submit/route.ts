import { DocumentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.document.update({ where: { id: params.id }, data: { status: DocumentStatus.SUBMITTED } });
  await logActivity({ userId: user.id, action: "DOCUMENT_SUBMITTED", entityType: "Document", entityId: params.id });
  return NextResponse.json({ success: true });
}
