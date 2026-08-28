import { readFile } from "fs/promises";
import path from "path";
import type { PDFDocument, PDFImage } from "pdf-lib";

let fontBytesPromise: Promise<{ regular: Buffer; bold: Buffer }> | null = null;

/** DejaVu Sans, Türkçe karakterleri (ı, ğ, ş, ç, ö, ü, İ) doğru render edebilmek için kullanılıyor. */
export function loadDejaVuFontBytes() {
  if (!fontBytesPromise) {
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    fontBytesPromise = Promise.all([
      readFile(path.join(fontsDir, "DejaVuSans.ttf")),
      readFile(path.join(fontsDir, "DejaVuSans-Bold.ttf")),
    ]).then(([regular, bold]) => ({ regular, bold }));
  }
  return fontBytesPromise;
}

/**
 * Company.logoUrl ("/uploads/logos/xxx.png" gibi yerel bir public/ yolu) varsa diskten okuyup
 * pdf-lib'e embed eder. Dosya bulunamazsa veya format desteklenmezse sessizce null döner —
 * logo olmadan da PDF üretimi devam edebilmeli.
 */
export async function embedLogoFromUrl(pdfDoc: PDFDocument, logoUrl: string | null | undefined): Promise<PDFImage | null> {
  if (!logoUrl || !logoUrl.startsWith("/uploads/")) return null;
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", logoUrl));
    const ext = path.extname(logoUrl).toLowerCase();
    if (ext === ".png") return await pdfDoc.embedPng(bytes);
    if (ext === ".jpg" || ext === ".jpeg") return await pdfDoc.embedJpg(bytes);
    return null;
  } catch {
    return null;
  }
}
