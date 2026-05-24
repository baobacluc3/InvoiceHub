import { DocumentStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { runDocumentOcr } from "@/lib/ocr-workflow";
import { updateOcrResultSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity";

export default async function DocumentOcrPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  const document = await prisma.document.findUnique({ where: { id }, include: { ocrResults: { include: { lineItems: true }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!document) notFound();
  const ocrResult = document.ocrResults[0];

  async function runAction() { "use server"; await runDocumentOcr(id, user.id, user.role); }

  async function saveAction(formData: FormData) {
    "use server";
    const lineItems = JSON.parse(String(formData.get("lineItems") || "[]")) as Array<{ label: string; value: string }>;
    const payload = updateOcrResultSchema.parse({
      documentId: id,
      fields: {
        invoiceNumber: String(formData.get("invoiceNumber") || ""), invoiceSymbol: String(formData.get("invoiceSymbol") || ""), invoiceDate: String(formData.get("invoiceDate") || ""), sellerName: String(formData.get("sellerName") || ""), sellerTaxCode: String(formData.get("sellerTaxCode") || ""), sellerAddress: String(formData.get("sellerAddress") || ""), buyerName: String(formData.get("buyerName") || ""), buyerTaxCode: String(formData.get("buyerTaxCode") || ""), buyerAddress: String(formData.get("buyerAddress") || ""), subtotal: String(formData.get("subtotal") || ""), vatAmount: String(formData.get("vatAmount") || ""), totalAmount: String(formData.get("totalAmount") || ""), currency: String(formData.get("currency") || ""),
      },
      lineItems,
    });
    const existing = await prisma.ocrResult.findFirst({ where: { documentId: id }, orderBy: { createdAt: "desc" } });
    if (!existing) throw new Error("No OCR result found. Run OCR first.");

    await prisma.$transaction(async (tx) => {
      await tx.ocrLineItem.deleteMany({ where: { ocrResultId: existing.id } });
      await tx.ocrResult.update({ where: { id: existing.id }, data: { fieldsJson: payload.fields, lineItems: { create: payload.lineItems } } });
    });
    await logActivity({ userId: user.id, action: "OCR_RESULT_UPDATED", entityType: "Document", entityId: id });
  }

  async function submitAction() { "use server"; await prisma.document.update({ where: { id }, data: { status: DocumentStatus.SUBMITTED } }); await logActivity({ userId: user.id, action: "DOCUMENT_SUBMITTED", entityType: "Document", entityId: id }); }

  const fields = (ocrResult?.fieldsJson as Record<string, string> | null) ?? null;
  return <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]"><section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="mb-2 text-lg font-semibold">Document Preview</h3><p className="text-sm text-slate-600">File: {document.fileName}</p><p className="text-sm text-slate-600">Storage path: {document.storagePath}</p><p className="mt-3 rounded-lg border border-dashed p-8 text-sm text-slate-600">Document preview area for OCR verification.</p><form action={runAction} className="mt-3"><button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-white">Run OCR</button></form></section>
  <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="mb-2 text-lg font-semibold">Editable OCR Result</h3><form action={saveAction} className="grid gap-2">{["invoiceNumber","invoiceSymbol","invoiceDate","sellerName","sellerTaxCode","sellerAddress","buyerName","buyerTaxCode","buyerAddress","subtotal","vatAmount","totalAmount","currency"].map((name)=><input key={name} name={name} defaultValue={fields?.[name] ?? ""} placeholder={name} className="w-full rounded-lg border p-2" />)}<textarea name="lineItems" defaultValue={JSON.stringify(ocrResult?.lineItems.map((item)=>({ label: item.label, value: item.value, confidence: item.confidence })) ?? [], null, 2)} className="min-h-36 w-full rounded-lg border p-2 font-mono text-xs" /><button className="rounded-lg border px-3 py-2" type="submit">Save OCR corrections</button></form><form action={submitAction} className="mt-2"><button className="rounded-lg bg-slate-900 px-3 py-2 text-white" type="submit">Submit for approval</button></form></section></div>;
}
