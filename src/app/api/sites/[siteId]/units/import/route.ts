import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

export const runtime = "nodejs";

const TYPE_MAP: Record<string, "MESKEN" | "ISYERI" | "DEPO" | "DIGER"> = {
  mesken: "MESKEN",
  "i̇şyeri": "ISYERI",
  isyeri: "ISYERI",
  depo: "DEPO",
  diğer: "DIGER",
  diger: "DIGER",
};
const ROOM_LAYOUT_MAP: Record<string, "BIR_ARTI_BIR" | "IKI_ARTI_BIR" | "UC_ARTI_BIR" | "DIGER"> = {
  "1+1": "BIR_ARTI_BIR",
  "2+1": "IKI_ARTI_BIR",
  "3+1": "UC_ARTI_BIR",
  diğer: "DIGER",
  diger: "DIGER",
};
const RELATION_MAP: Record<string, "MALIK" | "KIRACI"> = {
  malik: "MALIK",
  kiracı: "KIRACI",
  kiraci: "KIRACI",
};

function normalize(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in (value as object)) return String((value as { text: unknown }).text ?? "");
  return String(value).trim();
}

type RowError = { row: number; message: string };

export async function POST(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Excel dosyası bulunamadı." }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Dosya okunamadı. Geçerli bir .xlsx dosyası yükleyin." }, { status: 400 });
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return NextResponse.json({ error: "Excel dosyasında sayfa bulunamadı." }, { status: 400 });
  }

  const existingBlocks = await prisma.block.findMany({ where: { siteId }, select: { id: true, name: true } });
  const blockByName = new Map(existingBlocks.map((b) => [b.name, b.id]));
  const existingUnits = await prisma.unit.findMany({ where: { siteId }, select: { unitNumber: true, blockId: true } });
  const seenUnitKeys = new Set(existingUnits.map((u) => `${u.blockId ?? ""}::${u.unitNumber.toLowerCase()}`));

  const errors: RowError[] = [];
  let created = 0;

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const blockName = normalize(row.getCell(1).value);
    const unitNumber = normalize(row.getCell(2).value);
    const floor = normalize(row.getCell(3).value);
    const typeRaw = normalize(row.getCell(4).value);
    const roomLayoutRaw = normalize(row.getCell(5).value);
    const areaRaw = normalize(row.getCell(6).value);
    const fullName = normalize(row.getCell(7).value);
    const relationRaw = normalize(row.getCell(8).value);
    const phone = normalize(row.getCell(9).value);
    const email = normalize(row.getCell(10).value);

    if (!unitNumber && !fullName && !typeRaw) continue; // boş satır

    if (!unitNumber) {
      errors.push({ row: rowNumber, message: "Daire No boş olamaz." });
      continue;
    }
    const type = TYPE_MAP[typeRaw.toLowerCase()];
    if (!type) {
      errors.push({ row: rowNumber, message: `Geçersiz Tip: "${typeRaw}". Mesken/İşyeri/Depo/Diğer olmalı.` });
      continue;
    }
    if (!fullName) {
      errors.push({ row: rowNumber, message: "Sakin Ad Soyad boş olamaz." });
      continue;
    }
    const relationType = RELATION_MAP[relationRaw.toLowerCase()];
    if (!relationType) {
      errors.push({ row: rowNumber, message: `Geçersiz İlişki: "${relationRaw}". Malik/Kiracı olmalı.` });
      continue;
    }
    let roomLayout: "BIR_ARTI_BIR" | "IKI_ARTI_BIR" | "UC_ARTI_BIR" | "DIGER" | null = null;
    if (type === "MESKEN" && roomLayoutRaw) {
      roomLayout = ROOM_LAYOUT_MAP[roomLayoutRaw.toLowerCase()] ?? null;
      if (!roomLayout) {
        errors.push({ row: rowNumber, message: `Geçersiz Daire Boyutu: "${roomLayoutRaw}".` });
        continue;
      }
    }
    let areaM2: number | null = null;
    if (areaRaw) {
      const parsedArea = Number(areaRaw.replace(",", "."));
      if (Number.isNaN(parsedArea) || parsedArea <= 0) {
        errors.push({ row: rowNumber, message: `Geçersiz Metrekare: "${areaRaw}".` });
        continue;
      }
      areaM2 = parsedArea;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNumber, message: `Geçersiz E-posta: "${email}".` });
      continue;
    }

    let blockId: string | null = null;
    if (blockName) {
      const cachedId = blockByName.get(blockName);
      if (cachedId) {
        blockId = cachedId;
      } else {
        const block = await prisma.block.create({ data: { siteId, name: blockName } });
        blockByName.set(blockName, block.id);
        blockId = block.id;
      }
    }

    const unitKey = `${blockId ?? ""}::${unitNumber.toLowerCase()}`;
    if (seenUnitKeys.has(unitKey)) {
      errors.push({ row: rowNumber, message: `"${blockName || "Bloksuz"} / ${unitNumber}" zaten mevcut.` });
      continue;
    }

    await prisma.unit.create({
      data: {
        siteId,
        blockId,
        unitNumber,
        floor: floor || null,
        type,
        roomLayout,
        areaM2,
        residents: {
          create: {
            fullName,
            relationType,
            phone: phone || null,
            email: email || null,
          },
        },
      },
    });
    seenUnitKeys.add(unitKey);
    created += 1;
  }

  return NextResponse.json({ created, errors });
}
