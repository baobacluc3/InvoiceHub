import { readFile } from "node:fs/promises";
import { Document } from "@prisma/client";
import { z } from "zod";
import { resolveUploadStoragePath } from "@/lib/storage";

const OPENAI_OCR_MODEL = "gpt-4.1-mini";
const OCR_TIMEOUT_MS = 60_000;

const extractedFieldsSchema = z.object({
  invoiceNumber: z.string().default(""),
  invoiceSymbol: z.string().default(""),
  invoiceDate: z.string().default(""),
  sellerName: z.string().default(""),
  sellerTaxCode: z.string().default(""),
  sellerAddress: z.string().default(""),
  buyerName: z.string().default(""),
  buyerTaxCode: z.string().default(""),
  buyerAddress: z.string().default(""),
  subtotal: z.string().default(""),
  vatAmount: z.string().default(""),
  totalAmount: z.string().default(""),
  currency: z.string().default(""),
});

const ocrResultSchema = z.object({
  rawText: z.string().default(""),
  fields: extractedFieldsSchema,
  lineItems: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      confidence: z.number().min(0).max(1).optional(),
    }),
  ).default([]),
  confidenceScore: z.number().min(0).max(1).default(0),
});

export type OcrExtractedFields = z.infer<typeof extractedFieldsSchema>;
export type OcrLineItemInput = z.infer<typeof ocrResultSchema>['lineItems'][number];

export type OcrProviderResult = {
  rawText: string;
  fields: OcrExtractedFields;
  lineItems: OcrLineItemInput[];
  confidenceScore: number;
  rawJson: Record<string, unknown>;
};

export interface OcrProvider {
  extractTextFromDocument(document: Document): Promise<OcrProviderResult>;
}

class OcrProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OcrProviderError";
  }
}

class MockOcrProvider implements OcrProvider {
  async extractTextFromDocument(document: Document): Promise<OcrProviderResult> {
    const invoiceNumber = `INV-${document.createdAt.getFullYear()}-${document.id.slice(-6).toUpperCase()}`;

    return {
      rawText:
        "HÓA ĐƠN GIÁ TRỊ GIA TĂNG\nKý hiệu: 1C26TAA\nSố: " +
        invoiceNumber +
        "\nNgày: 12/04/2026\nĐơn vị bán hàng: Công ty TNHH Thương Mại Sao Biển\nMST: 0315987123\nĐịa chỉ: 125 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh\nNgười mua: Công ty Cổ phần Dịch vụ An Phát\nMST: 0307789123\nĐịa chỉ: 88 Trần Hưng Đạo, Quận 5, TP. Hồ Chí Minh\nCộng tiền hàng: 12,500,000\nThuế GTGT: 1,250,000\nTổng cộng thanh toán: 13,750,000 VND",
      fields: {
        invoiceNumber,
        invoiceSymbol: "1C26TAA",
        invoiceDate: "2026-04-12",
        sellerName: "Công ty TNHH Thương Mại Sao Biển",
        sellerTaxCode: "0315987123",
        sellerAddress: "125 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
        buyerName: "Công ty Cổ phần Dịch vụ An Phát",
        buyerTaxCode: "0307789123",
        buyerAddress: "88 Trần Hưng Đạo, Quận 5, TP. Hồ Chí Minh",
        subtotal: "12500000",
        vatAmount: "1250000",
        totalAmount: "13750000",
        currency: "VND",
      },
      lineItems: [
        { label: "Phí dịch vụ kế toán tháng 04/2026", value: "8500000", confidence: 0.93 },
        { label: "Phí tư vấn thuế", value: "4000000", confidence: 0.9 },
      ],
      confidenceScore: 0.92,
      rawJson: {
        provider: "mock",
        language: "vi",
        documentId: document.id,
      },
    };
  }
}

class OpenAiOcrProvider implements OcrProvider {
  async extractTextFromDocument(document: Document): Promise<OcrProviderResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new OcrProviderError("Missing API key: OPENAI_API_KEY is required for OCR_PROVIDER=openai.");
    }

    const mimeType = document.mimeType;
    const isImage = mimeType === "image/png" || mimeType === "image/jpeg";
    const isPdf = mimeType === "application/pdf";
    if (!isImage && !isPdf) {
      throw new OcrProviderError(`Unsupported file type: ${mimeType}.`);
    }

    const fileBuffer = await readFile(resolveUploadStoragePath(document.storagePath));
    const base64 = fileBuffer.toString("base64");

    const content = [
      { type: "input_text", text: "Extract invoice data and return strict JSON only." },
      {
        type: isImage ? "input_image" : "input_file",
        ...(isImage
          ? { image_url: `data:${mimeType};base64,${base64}` }
          : { filename: document.fileName, file_data: `data:${mimeType};base64,${base64}` }),
      },
    ];

    const response = await this.withTimeout(async (signal) =>
      fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal,
        body: JSON.stringify({
          model: OPENAI_OCR_MODEL,
          input: [
            {
              role: "system",
              content:
                "You are an OCR engine for invoices. Return strict JSON only with keys rawText, fields, lineItems, confidenceScore. Do not include markdown or extra keys.",
            },
            {
              role: "user",
              content: [
                ...content,
                {
                  type: "input_text",
                  text:
                    "fields must include: invoiceNumber, invoiceSymbol, invoiceDate, sellerName, sellerTaxCode, sellerAddress, buyerName, buyerTaxCode, buyerAddress, subtotal, vatAmount, totalAmount, currency. lineItems must be an array of {label,value,confidence?}.",
                },
              ],
            },
          ],
        }),
      }),
    );

    if (!response.ok) {
      const message = await response.text();
      throw new OcrProviderError(`API failure: ${response.status} ${message.slice(0, 500)}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const outputText = this.extractOutputText(payload);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(outputText);
    } catch {
      throw new OcrProviderError("Invalid response format: provider returned non-JSON content.");
    }

    const validated = ocrResultSchema.safeParse(parsedJson);
    if (!validated.success) {
      throw new OcrProviderError("Invalid response format: OCR JSON does not match expected schema.");
    }

    return {
      ...validated.data,
      rawJson: {
        provider: "openai",
        model: OPENAI_OCR_MODEL,
        response: payload,
      },
    };
  }

  private extractOutputText(payload: Record<string, unknown>) {
    const directText = typeof payload.output_text === "string" ? payload.output_text : null;
    if (directText) return directText;

    const output = Array.isArray(payload.output) ? payload.output : [];
    for (const chunk of output) {
      const content = typeof chunk === "object" && chunk !== null && "content" in chunk ? (chunk as { content?: unknown }).content : null;
      if (!Array.isArray(content)) continue;
      for (const item of content) {
        if (typeof item === "object" && item !== null && "type" in item && (item as { type?: unknown }).type === "output_text") {
          const text = (item as { text?: unknown }).text;
          if (typeof text === "string" && text.trim()) return text;
        }
      }
    }

    throw new OcrProviderError("Invalid response format: missing output text from OpenAI response.");
  }

  private async withTimeout<T>(runner: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);
    try {
      return await runner(controller.signal);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new OcrProviderError("OCR timeout: provider request exceeded timeout limit.");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

class GoogleVisionOcrProvider implements OcrProvider {
  async extractTextFromDocument(): Promise<OcrProviderResult> {
    throw new OcrProviderError("API failure: google_vision provider is not configured in this branch yet.");
  }
}

export function getOcrProvider(): OcrProvider {
  const provider = process.env.OCR_PROVIDER ?? "mock";
  if (provider === "mock") return new MockOcrProvider();
  if (provider === "openai") return new OpenAiOcrProvider();
  if (provider === "google_vision") return new GoogleVisionOcrProvider();

  throw new OcrProviderError(`Unsupported OCR provider: ${provider}`);
}
