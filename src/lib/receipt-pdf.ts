import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { DuesPaymentMethod } from "@/generated/prisma/enums";
import { loadDejaVuFontBytes, embedLogoFromUrl } from "@/lib/pdf-utils";

const PAYMENT_METHOD_LABELS: Record<DuesPaymentMethod, string> = {
  NAKIT: "Nakit",
  HAVALE: "Havale",
  EFT: "EFT",
  DIGER: "Diğer",
};

export type DuesReceiptData = {
  receiptNo: string;
  companyName: string;
  companyLogoUrl?: string | null;
  siteName: string;
  siteAddress?: string | null;
  unitLabel: string;
  period: Date;
  paymentAmount: number;
  paymentDate: Date;
  paymentMethod: DuesPaymentMethod;
  totalDue: number;
  totalPaid: number;
  remainingBalance: number;
};

// ₺ işareti DejaVu Sans'ta güvenilir şekilde bulunmadığından "TL" gösterimi kullanılıyor.
const numberFormatter = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currencyFormatter = { format: (n: number) => `${numberFormatter.format(n)} TL` };
const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
const periodFormatter = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });

export async function generateDuesReceiptPdf(data: DuesReceiptData): Promise<Uint8Array> {
  const { regular, bold } = await loadDejaVuFontBytes();

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(regular);
  const fontBold = await pdfDoc.embedFont(bold);
  const logo = await embedLogoFromUrl(pdfDoc, data.companyLogoUrl);

  const pageWidth = 420;
  const pageHeight = 560;
  const marginX = 40;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  if (logo) {
    const logoHeight = 32;
    const logoWidth = logo.width * (logoHeight / logo.height);
    page.drawImage(logo, {
      x: pageWidth - marginX - logoWidth,
      y: pageHeight - 50 - logoHeight + 10,
      width: logoWidth,
      height: logoHeight,
    });
  }

  let y = pageHeight - 50;

  const textLine = (text: string, opts: { size?: number; font?: PDFFont; gray?: number } = {}) => {
    page.drawText(text, {
      x: marginX,
      y,
      size: opts.size ?? 11,
      font: opts.font ?? font,
      color: rgb(opts.gray ?? 0.1, opts.gray ?? 0.1, opts.gray ?? 0.1),
    });
  };

  const rightAlignedText = (text: string, targetFont: PDFFont, size: number) => {
    const textWidth = targetFont.widthOfTextAtSize(text, size);
    return pageWidth - marginX - textWidth;
  };

  const row = (label: string, value: string, opts: { valueBold?: boolean } = {}) => {
    page.drawText(label, { x: marginX, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
    const valueFont = opts.valueBold ? fontBold : font;
    page.drawText(value, { x: rightAlignedText(value, valueFont, 11), y, size: 11, font: valueFont, color: rgb(0.1, 0.1, 0.1) });
    y -= 20;
  };

  const divider = (page_: PDFPage, yPos: number) => {
    page_.drawLine({
      start: { x: marginX, y: yPos },
      end: { x: pageWidth - marginX, y: yPos },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
  };

  textLine(data.companyName, { size: 14, font: fontBold });
  y -= 18;
  textLine(data.siteName, { size: 11 });
  if (data.siteAddress) {
    y -= 14;
    textLine(data.siteAddress, { size: 9, gray: 0.45 });
  }

  y -= 26;
  textLine("ÖDEME MAKBUZU", { size: 13, font: fontBold });
  y -= 4;
  page.drawText(data.receiptNo, { x: rightAlignedText(data.receiptNo, font, 9), y: y + 15, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
  y -= 10;
  divider(page, y);
  y -= 24;

  row("Daire", data.unitLabel);
  row("Dönem", periodFormatter.format(data.period));
  row("Ödeme Tarihi", dateFormatter.format(data.paymentDate));
  row("Ödeme Yöntemi", PAYMENT_METHOD_LABELS[data.paymentMethod]);

  y -= 4;
  divider(page, y);
  y -= 24;

  row("Ödenen Tutar", currencyFormatter.format(data.paymentAmount), { valueBold: true });

  y -= 4;
  divider(page, y);
  y -= 24;

  textLine("Hesap Özeti (güncel durum)", { size: 9, gray: 0.5 });
  y -= 18;
  row("Dönem Tahakkuku", currencyFormatter.format(data.totalDue));
  row("Toplam Ödenen", currencyFormatter.format(data.totalPaid));
  row("Kalan Bakiye", currencyFormatter.format(data.remainingBalance), { valueBold: true });

  return pdfDoc.save();
}
