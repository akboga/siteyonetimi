"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

const sitePersonnelSchema = z.object({
  fullName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı"),
  position: z.string().trim().min(1, "Görev gerekli"),
  hireDate: z.string().trim().optional(),
  salaryInfo: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
});

/** Site personeli (kapıcı, güvenlik, bahçıvan vb.) — sisteme giriş yapan `User` hesaplarından farklıdır. */
export async function createSitePersonnelAction(
  siteId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = sitePersonnelSchema.safeParse({
    fullName: formData.get("fullName"),
    position: formData.get("position"),
    hireDate: formData.get("hireDate"),
    salaryInfo: formData.get("salaryInfo"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  await prisma.staff.create({
    data: {
      siteId,
      fullName: parsed.data.fullName,
      position: parsed.data.position,
      hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate) : null,
      salaryInfo: parsed.data.salaryInfo,
    },
  });

  revalidatePath(`/sites/${siteId}/personnel`);
}

export async function updateSitePersonnelAction(
  siteId: string,
  staffId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = sitePersonnelSchema.safeParse({
    fullName: formData.get("fullName"),
    position: formData.get("position"),
    hireDate: formData.get("hireDate"),
    salaryInfo: formData.get("salaryInfo"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  await prisma.staff.update({
    where: { id: staffId, siteId },
    data: {
      fullName: parsed.data.fullName,
      position: parsed.data.position,
      hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate) : null,
      salaryInfo: parsed.data.salaryInfo,
    },
  });

  revalidatePath(`/sites/${siteId}/personnel`);
}

export async function deleteSitePersonnelAction(siteId: string, staffId: string) {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  await prisma.staff.delete({ where: { id: staffId, siteId } });

  revalidatePath(`/sites/${siteId}/personnel`);
}
