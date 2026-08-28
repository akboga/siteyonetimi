"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";

const bankAccountSchema = z.object({
  name: z.string().trim().min(1, "Hesap adı gerekli"),
  type: z.enum(["KASA", "BANKA"]),
  bankName: z.string().trim().optional(),
  iban: z.string().trim().optional(),
  openingBalance: z.coerce.number().optional().or(z.literal("").transform(() => undefined)),
});

export async function createBankAccountAction(
  siteId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = bankAccountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    bankName: formData.get("bankName"),
    iban: formData.get("iban"),
    openingBalance: formData.get("openingBalance"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  await prisma.bankAccount.create({
    data: {
      siteId,
      name: parsed.data.name,
      type: parsed.data.type,
      bankName: parsed.data.type === "BANKA" ? parsed.data.bankName || null : null,
      iban: parsed.data.type === "BANKA" ? parsed.data.iban || null : null,
      openingBalance: parsed.data.openingBalance ?? 0,
    },
  });

  revalidatePath(`/sites/${siteId}/bank-accounts`);
}

export async function deleteBankAccountAction(siteId: string, accountId: string) {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  await prisma.bankAccount.delete({ where: { id: accountId, siteId } });

  revalidatePath(`/sites/${siteId}/bank-accounts`);
}

async function getAccountSiteId(accountId: string) {
  const account = await prisma.bankAccount.findUniqueOrThrow({ where: { id: accountId }, select: { siteId: true } });
  return account.siteId;
}

const transactionSchema = z.object({
  date: z.string().trim().min(1, "Tarih gerekli"),
  amount: z.coerce.number().positive("Tutar sıfırdan büyük olmalı"),
  direction: z.enum(["GIRIS", "CIKIS"]),
  description: z.string().trim().optional(),
});

export async function createBankTransactionAction(
  accountId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  const siteId = await getAccountSiteId(accountId);
  await assertSiteAccess(user, siteId);

  const parsed = transactionSchema.safeParse({
    date: formData.get("date"),
    amount: formData.get("amount"),
    direction: formData.get("direction"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  await prisma.bankTransaction.create({
    data: {
      accountId,
      date: new Date(parsed.data.date),
      amount: parsed.data.amount,
      direction: parsed.data.direction,
      description: parsed.data.description || null,
    },
  });

  revalidatePath(`/sites/${siteId}/bank-accounts`);
}

export async function deleteBankTransactionAction(accountId: string, transactionId: string) {
  const user = await requireCompanyUser();
  const siteId = await getAccountSiteId(accountId);
  await assertSiteAccess(user, siteId);

  await prisma.bankTransaction.delete({ where: { id: transactionId, accountId } });

  revalidatePath(`/sites/${siteId}/bank-accounts`);
}
