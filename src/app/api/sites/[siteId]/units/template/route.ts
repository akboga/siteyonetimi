import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

export const runtime = "nodejs";

const TYPE_OPTIONS = ["Mesken", "İşyeri", "Depo", "Diğer"];
const ROOM_LAYOUT_OPTIONS = ["1+1", "2+1", "3+1", "Diğer"];
const RELATION_OPTIONS = ["Malik", "Kiracı"];

const COLUMNS = [
  { header: "Blok", key: "blockName", width: 14 },
  { header: "Daire No", key: "unitNumber", width: 12 },
  { header: "Kat", key: "floor", width: 10 },
  { header: "Tip", key: "type", width: 14 },
  { header: "Daire Boyutu", key: "roomLayout", width: 14 },
  { header: "Metrekare", key: "areaM2", width: 12 },
  { header: "Sakin Ad Soyad", key: "fullName", width: 22 },
  { header: "İlişki", key: "relationType", width: 12 },
  { header: "Telefon", key: "phone", width: 16 },
  { header: "E-posta", key: "email", width: 24 },
];

export async function GET(_request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Daireler");
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };

  sheet.addRow({
    blockName: "A",
    unitNumber: "1",
    floor: "1",
    type: "Mesken",
    roomLayout: "2+1",
    areaM2: 110,
    fullName: "Örnek Sakin",
    relationType: "Malik",
    phone: "0555 555 55 55",
    email: "ornek@sirket.com",
  });

  const lastRow = 500;
  for (let r = 2; r <= lastRow; r++) {
    sheet.getCell(`D${r}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`"${TYPE_OPTIONS.join(",")}"`],
    };
    sheet.getCell(`E${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${ROOM_LAYOUT_OPTIONS.join(",")}"`],
    };
    sheet.getCell(`H${r}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`"${RELATION_OPTIONS.join(",")}"`],
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="daire-sablonu.xlsx"`,
    },
  });
}
