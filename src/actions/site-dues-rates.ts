"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

const rateSchema = z.object({
  amount: z.coerce.number().positive("Tutar sıfırdan büyük olmalı"),
  validFrom: z.string().trim().min(1, "Başlangıç tarihi gerekli"),
});

/**
 * Siteye yeni bir aidat tarifesi ekler. Bu tarihten önce başlayan ve hâlâ açık uçlu olan
 * (validTo=null) önceki tarife varsa, validTo'su otomatik olarak yeni tarifenin validFrom'una
 * çekilerek kapatılır — böylece iki tarife asla çakışmaz.
 */
export async function setSiteDuesRateAction(
  siteId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = rateSchema.safeParse({
    amount: formData.get("amount"),
    validFrom: formData.get("validFrom"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  const validFrom = new Date(parsed.data.validFrom);

  await prisma.$transaction(async (tx) => {
    const openEnded = await tx.siteDuesRate.findFirst({
      where: { siteId, validTo: null, validFrom: { lt: validFrom } },
      orderBy: { validFrom: "desc" },
    });
    if (openEnded) {
      await tx.siteDuesRate.update({ where: { id: openEnded.id }, data: { validTo: validFrom } });
    }
    await tx.siteDuesRate.create({ data: { siteId, amount: parsed.data.amount, validFrom } });
  });

  revalidatePath(`/sites/${siteId}/edit`);
}

export async function deleteSiteDuesRateAction(siteId: string, rateId: string) {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  await prisma.siteDuesRate.delete({ where: { id: rateId, siteId } });

  revalidatePath(`/sites/${siteId}/edit`);
}
