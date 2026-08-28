"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { calculateLateFee, monthsOverdue } from "@/lib/late-fee";

const generateDuesSchema = z.object({
  period: z.string().trim().regex(/^\d{4}-\d{2}$/, "Dönem YYYY-AA biçiminde seçilmeli"),
  amount: z.coerce.number().positive("Tutar sıfırdan büyük olmalı"),
});

/** Site'deki tüm daireler için verilen dönemde aidat tahakkuku oluşturur (o dönem için kaydı olmayanlara). */
export async function generateDuesForSiteAction(
  siteId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const parsed = generateDuesSchema.safeParse({
    period: formData.get("period"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  const period = new Date(`${parsed.data.period}-01T00:00:00.000Z`);

  const units = await prisma.unit.findMany({ where: { siteId }, select: { id: true } });
  const existing = await prisma.duesRecord.findMany({
    where: { unitId: { in: units.map((u) => u.id) }, period },
    select: { unitId: true },
  });
  const existingUnitIds = new Set(existing.map((d) => d.unitId));
  const targetUnits = units.filter((u) => !existingUnitIds.has(u.id));

  if (targetUnits.length === 0) {
    return "Bu dönem için tüm dairelerde zaten aidat kaydı var.";
  }

  await prisma.duesRecord.createMany({
    data: targetUnits.map((u) => ({ unitId: u.id, period, amount: parsed.data.amount })),
  });

  revalidatePath(`/sites/${siteId}`);
  revalidatePath(`/sites/${siteId}/dues`);
}

async function getUnitSiteId(unitId: string) {
  const unit = await prisma.unit.findUniqueOrThrow({ where: { id: unitId }, select: { siteId: true } });
  return unit.siteId;
}

const paymentSchema = z.object({
  paidAmount: z.coerce.number().positive("Ödeme tutarı sıfırdan büyük olmalı"),
  paymentDate: z.string().trim().min(1, "Ödeme tarihi gerekli"),
  paymentMethod: z.enum(["NAKIT", "HAVALE", "EFT", "DIGER"]),
});

/** Bir aidat kaydına ödeme işler (kısmi ödemeler mevcut tutara eklenir). */
export async function recordDuesPaymentAction(
  unitId: string,
  duesRecordId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  const siteId = await getUnitSiteId(unitId);
  await assertSiteAccess(user, siteId);

  const parsed = paymentSchema.safeParse({
    paidAmount: formData.get("paidAmount"),
    paymentDate: formData.get("paymentDate"),
    paymentMethod: formData.get("paymentMethod"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  const record = await prisma.duesRecord.findUnique({ where: { id: duesRecordId, unitId } });
  if (!record) return "Aidat kaydı bulunamadı.";

  const paymentDate = new Date(parsed.data.paymentDate);

  await prisma.$transaction([
    prisma.duesPayment.create({
      data: {
        duesRecordId,
        amount: parsed.data.paidAmount,
        paymentDate,
        paymentMethod: parsed.data.paymentMethod,
      },
    }),
    prisma.duesRecord.update({
      where: { id: duesRecordId },
      data: {
        paidAmount: { increment: parsed.data.paidAmount },
        paymentDate,
        paymentMethod: parsed.data.paymentMethod,
      },
    }),
  ]);

  revalidatePath(`/units/${unitId}`);
  revalidatePath(`/sites/${siteId}/dues`);
}

const lateFeeSchema = z.object({
  lateFee: z.coerce.number().min(0, "Gecikme faizi negatif olamaz"),
});

export async function setDuesLateFeeAction(
  unitId: string,
  duesRecordId: string,
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const user = await requireCompanyUser();
  const siteId = await getUnitSiteId(unitId);
  await assertSiteAccess(user, siteId);

  const parsed = lateFeeSchema.safeParse({ lateFee: formData.get("lateFee") });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Girilen bilgiler geçersiz.";
  }

  await prisma.duesRecord.update({
    where: { id: duesRecordId, unitId },
    data: { lateFee: parsed.data.lateFee },
  });

  revalidatePath(`/units/${unitId}`);
  revalidatePath(`/sites/${siteId}/dues`);
}

/**
 * Sitenin tanımlı gecikme faiz oranına göre, vadesi geçmiş tüm aidat kayıtlarının faizini
 * yeniden hesaplayıp uygular (manuel `setDuesLateFeeAction` ile girilenlerin üzerine yazar).
 */
export async function applyCalculatedLateFeesAction(siteId: string): Promise<string | undefined> {
  const user = await requireCompanyUser();
  await assertSiteAccess(user, siteId);

  const site = await prisma.site.findUniqueOrThrow({
    where: { id: siteId },
    select: { lateFeeRatePercent: true },
  });
  if (site.lateFeeRatePercent === null) {
    return "Bu site için gecikme faiz oranı tanımlı değil. Önce site ayarlarından bir oran girin.";
  }
  const ratePercent = Number(site.lateFeeRatePercent);

  const now = new Date();
  const currentPeriodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const records = await prisma.duesRecord.findMany({
    where: { unit: { siteId }, period: { lt: currentPeriodStart } },
    select: { id: true, period: true, amount: true, paidAmount: true },
  });

  if (records.length === 0) {
    return "Vadesi geçmiş aidat kaydı bulunamadı.";
  }

  await prisma.$transaction(
    records.map((r) => {
      const outstandingPrincipal = Number(r.amount) - Number(r.paidAmount);
      const lateFee = calculateLateFee(outstandingPrincipal, ratePercent, monthsOverdue(r.period, now));
      return prisma.duesRecord.update({ where: { id: r.id }, data: { lateFee } });
    }),
  );

  revalidatePath(`/sites/${siteId}/dues`);
}

export async function deleteDuesRecordAction(unitId: string, duesRecordId: string) {
  const user = await requireCompanyUser();
  const siteId = await getUnitSiteId(unitId);
  await assertSiteAccess(user, siteId);

  await prisma.duesRecord.delete({ where: { id: duesRecordId, unitId } });

  revalidatePath(`/units/${unitId}`);
  revalidatePath(`/sites/${siteId}/dues`);
}
