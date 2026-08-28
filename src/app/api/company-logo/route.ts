import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

export const runtime = "nodejs";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
};
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const admin = await requireRole("COMPANY_ADMIN");
  if (!admin.companyId) return NextResponse.json({ error: "Şirket bulunamadı." }, { status: 400 });

  const formData = await request.formData();
  const file = formData.get("logo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Logo dosyası bulunamadı." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Sadece PNG veya JPG dosyaları yüklenebilir." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Logo dosyası en fazla 2 MB olabilir." }, { status: 400 });
  }

  const company = await prisma.company.findUniqueOrThrow({ where: { id: admin.companyId } });

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "logos");
  await mkdir(uploadsDir, { recursive: true });

  if (company.logoUrl) {
    await unlink(path.join(process.cwd(), "public", company.logoUrl)).catch(() => {});
  }

  const fileName = `${admin.companyId}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, fileName), bytes);

  const logoUrl = `/uploads/logos/${fileName}`;
  await prisma.company.update({ where: { id: admin.companyId }, data: { logoUrl } });

  return NextResponse.json({ logoUrl: `${logoUrl}?v=${Date.now()}` });
}
