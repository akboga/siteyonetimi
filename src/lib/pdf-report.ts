import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { loadDejaVuFontBytes, embedLogoFromUrl } from "@/lib/pdf-utils";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });

export type TableColumn = { label: string; width: number; align?: "left" | "right" };

/**
 * Çok sayfalı, tablo/paragraf destekleyen genel raporlar için basit bir PDF oluşturucu.
 * receipt-pdf.ts'teki sabit tek-sayfa yaklaşımının aksine, değişken uzunluktaki listeler
 * (aidat kayıtları, arızalar, kararlar…) sayfa sonuna gelindiğinde otomatik yeni sayfaya geçer.
 */
export class PdfReportBuilder {
  private doc: PDFDocument;
  private font: PDFFont;
  private fontBold: PDFFont;
  private logo: PDFImage | null;
  private page!: PDFPage;
  private y = 0;
  private headerTitle = "";
  private headerSubtitle = "";
  private companyName = "";
  private pageNumber = 0;

  private constructor(doc: PDFDocument, font: PDFFont, fontBold: PDFFont, logo: PDFImage | null) {
    this.doc = doc;
    this.font = font;
    this.fontBold = fontBold;
    this.logo = logo;
  }

  static async create(): Promise<PdfReportBuilder> {
    const { regular, bold } = await loadDejaVuFontBytes();
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(regular);
    const fontBold = await doc.embedFont(bold);
    return new PdfReportBuilder(doc, font, fontBold, null);
  }

  /** Rapor gövdesinde her yeni sayfanın üstünde tekrarlanacak başlık bilgisini ayarlar. */
  async setHeader(opts: { companyName: string; companyLogoUrl?: string | null; title: string; subtitle: string }) {
    this.companyName = opts.companyName;
    this.headerTitle = opts.title;
    this.headerSubtitle = opts.subtitle;
    if (opts.companyLogoUrl) {
      this.logo = await embedLogoFromUrl(this.doc, opts.companyLogoUrl);
    }
    this.newPage();
  }

  private newPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pageNumber += 1;
    this.y = PAGE_HEIGHT - MARGIN;
    this.drawPageHeader();
  }

  private drawPageHeader() {
    if (this.logo) {
      const h = 28;
      const w = this.logo.width * (h / this.logo.height);
      this.page.drawImage(this.logo, { x: PAGE_WIDTH - MARGIN - w, y: this.y - h + 6, width: w, height: h });
    }
    this.page.drawText(this.companyName, { x: MARGIN, y: this.y, size: 10, font: this.fontBold, color: rgb(0.3, 0.3, 0.3) });
    this.y -= 20;
    this.page.drawText(this.headerTitle, { x: MARGIN, y: this.y, size: 16, font: this.fontBold, color: rgb(0.1, 0.1, 0.1) });
    this.y -= 18;
    this.page.drawText(this.headerSubtitle, { x: MARGIN, y: this.y, size: 10, font: this.font, color: rgb(0.4, 0.4, 0.4) });
    this.y -= 12;
    this.divider();
    this.y -= 14;
  }

  /** Kalan alan yetersizse yeni sayfaya geçer ve geçiş olup olmadığını döner. */
  private ensureSpace(height: number): boolean {
    if (this.y - height < MARGIN + 20) {
      this.newPage();
      return true;
    }
    return false;
  }

  private divider() {
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.75,
      color: rgb(0.85, 0.85, 0.85),
    });
  }

  sectionTitle(text: string) {
    this.ensureSpace(28);
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 12, font: this.fontBold, color: rgb(0.15, 0.15, 0.15) });
    this.y -= 8;
    this.divider();
    this.y -= 16;
  }

  keyValueRow(label: string, value: string, opts: { valueBold?: boolean } = {}) {
    this.ensureSpace(18);
    this.page.drawText(label, { x: MARGIN, y: this.y, size: 10, font: this.font, color: rgb(0.4, 0.4, 0.4) });
    const valueFont = opts.valueBold ? this.fontBold : this.font;
    const width = valueFont.widthOfTextAtSize(value, 10.5);
    this.page.drawText(value, {
      x: PAGE_WIDTH - MARGIN - width,
      y: this.y,
      size: 10.5,
      font: valueFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    this.y -= 18;
  }

  /** Uzun metinleri (toplantı tutanağı, karar metni vb.) sütun genişliğine göre satırlara bölerek yazar. */
  paragraph(text: string, opts: { size?: number; gray?: number } = {}) {
    const size = opts.size ?? 10;
    const color = rgb(opts.gray ?? 0.15, opts.gray ?? 0.15, opts.gray ?? 0.15);
    const words = text.split(/\s+/);
    let line = "";
    const lines: string[] = [];
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (this.font.widthOfTextAtSize(candidate, size) > CONTENT_WIDTH && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);

    for (const l of lines) {
      this.ensureSpace(15);
      this.page.drawText(l, { x: MARGIN, y: this.y, size, font: this.font, color });
      this.y -= 14;
    }
  }

  emptyState(text: string) {
    this.ensureSpace(20);
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 10, font: this.font, color: rgb(0.55, 0.55, 0.55) });
    this.y -= 20;
  }

  spacer(height = 10) {
    this.y -= height;
  }

  /** Hücre metni sütun genişliğini (padding düşülmüş) aşıyorsa sonuna "…" ekleyerek kısaltır. */
  private truncateToWidth(font: PDFFont, text: string, size: number, maxWidth: number): string {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
    const ellipsis = "…";
    let result = text;
    while (result.length > 1 && font.widthOfTextAtSize(result + ellipsis, size) > maxWidth) {
      result = result.slice(0, -1);
    }
    return result + ellipsis;
  }

  /** Otomatik sayfalanan, sayfa değişiminde başlık satırını tekrar çizen basit bir tablo. Sütunlar arası boşluk bırakır ve taşan metni kısaltır. */
  table(columns: TableColumn[], rows: string[][]) {
    const COLUMN_PADDING = 8;

    const drawHeaderRow = () => {
      let x = MARGIN;
      for (const col of columns) {
        const usableWidth = col.width - COLUMN_PADDING;
        const text = this.truncateToWidth(this.fontBold, col.label, 9, usableWidth);
        const textX = col.align === "right" ? x + usableWidth - this.fontBold.widthOfTextAtSize(text, 9) : x;
        this.page.drawText(text, { x: textX, y: this.y, size: 9, font: this.fontBold, color: rgb(0.35, 0.35, 0.35) });
        x += col.width;
      }
      this.y -= 8;
      this.divider();
      this.y -= 14;
    };

    this.ensureSpace(24);
    drawHeaderRow();

    for (const row of rows) {
      if (this.ensureSpace(18)) {
        drawHeaderRow();
      }
      let x = MARGIN;
      row.forEach((cell, i) => {
        const col = columns[i];
        const size = 9.5;
        const usableWidth = col.width - COLUMN_PADDING;
        const text = this.truncateToWidth(this.font, cell, size, usableWidth);
        const textX = col.align === "right" ? x + usableWidth - this.font.widthOfTextAtSize(text, size) : x;
        this.page.drawText(text, { x: textX, y: this.y, size, font: this.font, color: rgb(0.15, 0.15, 0.15) });
        x += col.width;
      });
      this.y -= 17;
    }
  }

  async save(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

export function formatReportDate(date: Date | null | undefined) {
  return date ? dateFormatter.format(date) : "—";
}
