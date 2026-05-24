import { UserRole } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { resolveUploadStoragePath } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return new NextResponse("Not found", { status: 404 });

  if (user.role === UserRole.STAFF && document.uploadedById !== user.id) {
    return new NextResponse("Not found", { status: 404 });
  }

  const fileBuffer = await readFile(resolveUploadStoragePath(document.storagePath));

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `inline; filename="${document.originalFileName}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
