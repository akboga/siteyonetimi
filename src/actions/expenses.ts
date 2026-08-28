"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

const expenseSchema = z.object({
  category: z.string().trim().min(1, "Kategori gerekli"),
  amount: z.coerce.number().positive("Tutar sıfırdan büyük olmalı"),
  date: z.string().trim().min(1, "Tarih gerekli"),
  description: z.string().trim().optional(),
  attachmentUrl: z.string().trim().optional(),
});

export async function createExpenseAction(
  siteId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = expenseSchema.safeParse({
    category: formData.get("category"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    description: formData.get("description"),
    attachmentUrl: formData.get("attachmentUrl"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  await prisma.expense.create({
    data: {
      siteId,
      category: parsed.data.category,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      description: parsed.data.description || null,
      attachmentUrl: parsed.data.attachmentUrl || null,
    },
  });

  revalidatePath(`/sites/${siteId}/expenses`);
}

export async function deleteExpenseAction(siteId: string, expenseId: string) {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  await prisma.expense.delete({ where: { id: expenseId, siteId } });

  revalidatePath(`/sites/${siteId}/expenses`);
}
