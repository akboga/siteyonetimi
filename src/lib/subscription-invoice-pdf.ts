import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import { loadDejaVuFontBytes, embedLogoFromUrl } from "@/lib/pdf-utils";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  BEKLIYOR: "Bekliyor",
  ODENDI: "Ödendi",
  GECIKTI: "Gecikti",
};

export type SubscriptionInvoiceData = {
  invoiceNo: string;
  companyName: string;
  companyLogoUrl?: string | null;
  packageName?: string | null;
  period: Date;
  unitCount: number;
  amount: number;
  status: InvoiceStatus;
  paidAt?: Date | null;
};

const numberFormatter = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currencyFormatter = { format: (n: number) => `${numberFormatter.format(n)} TL` };
const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
const periodFormatter = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });

export async function generateSubscriptionInvoicePdf(data: SubscriptionInvoiceData): Promise<Uint8Array> {
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
  textLine("Apsis Site ve Apartman Yönetim Otomasyonu", { size: 9, gray: 0.45 });

  y -= 26;
  textLine("ABONELİK FATURASI", { size: 13, font: fontBold });
  y -= 4;
  page.drawText(data.invoiceNo, { x: rightAlignedText(data.invoiceNo, font, 9), y: y + 15, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
  y -= 10;
  divider(page, y);
  y -= 24;

  row("Dönem", periodFormatter.format(data.period));
  if (data.packageName) row("Paket", data.packageName);
  row("Daire Sayısı", String(data.unitCount));
  row("Durum", STATUS_LABELS[data.status]);
  if (data.paidAt) row("Ödeme Tarihi", dateFormatter.format(data.paidAt));

  y -= 4;
  divider(page, y);
  y -= 24;

  row("Toplam Tutar", currencyFormatter.format(data.amount), { valueBold: true });

  return pdfDoc.save();
}
