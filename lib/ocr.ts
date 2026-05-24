import { Document } from "@prisma/client";

export type OcrExtractedFields = {
  invoiceNumber: string;
  invoiceSymbol: string;
  invoiceDate: string;
  sellerName: string;
  sellerTaxCode: string;
  sellerAddress: string;
  buyerName: string;
  buyerTaxCode: string;
  buyerAddress: string;
  subtotal: string;
  vatAmount: string;
  totalAmount: string;
  currency: string;
};

export type OcrLineItemInput = {
  label: string;
  value: string;
  confidence?: number;
};

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

export function getOcrProvider(): OcrProvider {
  const provider = process.env.OCR_PROVIDER ?? "mock";
  if (provider === "mock") return new MockOcrProvider();

  throw new Error(`Unsupported OCR provider: ${provider}`);
}
