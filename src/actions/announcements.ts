"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

const announcementSchema = z.object({
  title: z.string().trim().min(1, "Başlık gerekli"),
  content: z.string().trim().min(1, "İçerik gerekli"),
  audience: z.enum(["TUM_SITE", "BLOK", "SECILI_DAIRELER"]),
  blockId: z.string().trim().optional(),
});

export async function createAnnouncementAction(
  siteId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    audience: formData.get("audience"),
    blockId: formData.get("blockId"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  if (parsed.data.audience === "BLOK") {
    if (!parsed.data.blockId) return "Blok bazlı duyuru için blok seçilmeli.";
    const block = await prisma.block.findUnique({ where: { id: parsed.data.blockId } });
    if (!block || block.siteId !== siteId) return "Geçersiz blok seçimi.";
  }

  const unitIds = parsed.data.audience === "SECILI_DAIRELER"
    ? formData.getAll("unitIds").filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  if (parsed.data.audience === "SECILI_DAIRELER") {
    if (unitIds.length === 0) return "Seçili daire duyurusu için en az bir daire seçilmeli.";
    const units = await prisma.unit.findMany({ where: { id: { in: unitIds } }, select: { id: true, siteId: true } });
    if (units.length !== unitIds.length || units.some((u) => u.siteId !== siteId)) {
      return "Geçersiz daire seçimi.";
    }
  }

  await prisma.announcement.create({
    data: {
      siteId,
      title: parsed.data.title,
      content: parsed.data.content,
      audience: parsed.data.audience,
      blockId: parsed.data.audience === "BLOK" ? parsed.data.blockId : null,
      units: unitIds.length > 0 ? { connect: unitIds.map((id) => ({ id })) } : undefined,
    },
  });

  revalidatePath(`/sites/${siteId}/announcements`);
}

export async function deleteAnnouncementAction(siteId: string, announcementId: string) {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  await prisma.announcement.delete({ where: { id: announcementId, siteId } });

  revalidatePath(`/sites/${siteId}/announcements`);
}
