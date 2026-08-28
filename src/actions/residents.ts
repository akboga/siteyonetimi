"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

const residentSchema = z.object({
  fullName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı"),
  nationalId: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.email("Geçerli bir e-posta girin").optional().or(z.literal("")),
  relationType: z.enum(["MALIK", "KIRACI"]),
  moveInDate: z.string().trim().optional(),
});

async function getUnitSiteId(unitId: string) {
  const unit = await prisma.unit.findUniqueOrThrow({ where: { id: unitId }, select: { siteId: true } });
  return unit.siteId;
}

export async function createResidentAction(
  unitId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  const siteId = await getUnitSiteId(unitId);
  await assertSiteAccess(user, siteId);

  const parsed = residentSchema.safeParse({
    fullName: formData.get("fullName"),
    nationalId: formData.get("nationalId"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    relationType: formData.get("relationType"),
    moveInDate: formData.get("moveInDate"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  await prisma.resident.create({
    data: {
      unitId,
      fullName: parsed.data.fullName,
      nationalId: parsed.data.nationalId || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      relationType: parsed.data.relationType,
      moveInDate: parsed.data.moveInDate ? new Date(parsed.data.moveInDate) : null,
    },
  });

  revalidatePath(`/units/${unitId}`);
}

export async function markResidentMovedOutAction(unitId: string, residentId: string) {
  const user = await requireCompanyUser();
  const siteId = await getUnitSiteId(unitId);
  await assertSiteAccess(user, siteId);

  await prisma.resident.update({
    where: { id: residentId, unitId },
    data: { isActive: false, moveOutDate: new Date() },
  });

  revalidatePath(`/units/${unitId}`);
}

export async function deleteResidentAction(unitId: string, residentId: string) {
  const user = await requireCompanyUser();
  const siteId = await getUnitSiteId(unitId);
  await assertSiteAccess(user, siteId);

  await prisma.resident.delete({ where: { id: residentId, unitId } });

  revalidatePath(`/units/${unitId}`);
}
