import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  allowedUploadMimeTypes,
  getSafeUploadFileName,
  maxUploadFileSizeBytes,
  saveUploadedFile,
} from "@/lib/storage";
import { uploadDocumentSchema } from "@/lib/validators";

async function uploadDocumentsAction(formData: FormData) {
  "use server";

  const user = await requireRole([UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN]);

  const parsed = uploadDocumentSchema.safeParse({
    companyId: formData.get("companyId"),
    documentTypeId: formData.get("documentTypeId"),
    accountingPeriod: formData.get("accountingPeriod"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    redirect("/upload?error=invalid-input");
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    redirect("/upload?error=no-files");
  }

  for (const file of files) {
    if (!allowedUploadMimeTypes.includes(file.type)) {
      redirect("/upload?error=invalid-file-type");
    }

    if (file.size > maxUploadFileSizeBytes) {
      redirect("/upload?error=file-too-large");
    }

    const safeFileName = getSafeUploadFileName(file.type);
    const storageResult = await saveUploadedFile(file, safeFileName);

    const document = await prisma.document.create({
      data: {
        companyId: parsed.data.companyId,
        documentTypeId: parsed.data.documentTypeId,
        uploadedById: user.id,
        originalFileName: file.name,
        fileName: safeFileName,
        storagePath: storageResult.storagePath,
        mimeType: storageResult.mimeType,
        accountingPeriod: parsed.data.accountingPeriod,
        notes: parsed.data.notes,
        status: "UPLOADED",
      },
    });

    await logActivity({
      userId: user.id,
      action: "DOCUMENT_UPLOADED",
      entityType: "DOCUMENT",
      entityId: document.id,
      metadata: {
        originalFileName: file.name,
        storagePath: storageResult.storagePath,
      },
    });
  }

  revalidatePath("/documents");
  redirect("/documents");
}

export default async function UploadPage() {
  const user = await requireRole([UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN]);
  const [companies, documentTypes] = await Promise.all([
    prisma.company.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.documentType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Upload Documents</h2>
        <p className="text-sm text-slate-600">Signed in as {user.email}. Allowed formats: PDF, JPG, PNG. Max 10MB per file.</p>
      </div>

      <form action={uploadDocumentsAction} className="space-y-4 rounded border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm">Company</span>
            <select className="w-full rounded border p-2" name="companyId" required>
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm">Document type</span>
            <select className="w-full rounded border p-2" name="documentTypeId" required>
              <option value="">Select type</option>
              {documentTypes.map((documentType) => (
                <option key={documentType.id} value={documentType.id}>{documentType.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm">Accounting period (YYYY-MM)</span>
            <input className="w-full rounded border p-2" name="accountingPeriod" pattern="^\d{4}-(0[1-9]|1[0-2])$" placeholder="2026-05" required />
          </label>

          <label className="space-y-1">
            <span className="text-sm">Files</span>
            <input className="w-full rounded border p-2" name="files" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple required />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm">Notes (optional)</span>
          <textarea className="w-full rounded border p-2" name="notes" rows={3} />
        </label>

        <button className="rounded border bg-slate-900 px-4 py-2 text-white" type="submit">Upload</button>
      </form>
    </div>
  );
}
