"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

const budgetItemSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  category: z.string().trim().min(1, "Kategori gerekli"),
  plannedAmount: z.coerce.number().min(0, "Planlanan tutar negatif olamaz"),
});

/** Site'nin verilen yıl+kategori için bütçe kalemini oluşturur veya günceller. */
export async function setBudgetItemAction(
  siteId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = budgetItemSchema.safeParse({
    year: formData.get("year"),
    category: formData.get("category"),
    plannedAmount: formData.get("plannedAmount"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  await prisma.budgetItem.upsert({
    where: {
      siteId_year_category: {
        siteId,
        year: parsed.data.year,
        category: parsed.data.category,
      },
    },
    create: {
      siteId,
      year: parsed.data.year,
      category: parsed.data.category,
      plannedAmount: parsed.data.plannedAmount,
    },
    update: {
      plannedAmount: parsed.data.plannedAmount,
    },
  });

  revalidatePath(`/sites/${siteId}/budget`);
}

export async function deleteBudgetItemAction(siteId: string, budgetItemId: string) {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  await prisma.budgetItem.delete({ where: { id: budgetItemId, siteId } });

  revalidatePath(`/sites/${siteId}/budget`);
}
