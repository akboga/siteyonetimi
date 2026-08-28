"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

/** Verilen dönem (YYYY-AA) için, henüz faturası oluşturulmamış her aktif ve pakete atanmış şirkete abonelik faturası üretir. */
export async function generateMonthlyInvoicesAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await requireRole("SUPER_ADMIN");

  const period = String(formData.get("period") ?? "");
  if (!/^\d{4}-\d{2}$/.test(period)) return "Dönem YYYY-AA biçiminde seçilmeli.";
  const periodDate = new Date(`${period}-01T00:00:00.000Z`);

  const companies = await prisma.company.findMany({
    where: { subscriptionStatus: "ACTIVE", packageId: { not: null } },
    select: {
      id: true,
      customMonthlyPrice: true,
      package: { select: { monthlyPrice: true } },
      sites: { select: { _count: { select: { units: true } } } },
    },
  });

  const existing = await prisma.invoice.findMany({
    where: { period: periodDate, companyId: { in: companies.map((c) => c.id) } },
    select: { companyId: true },
  });
  const existingCompanyIds = new Set(existing.map((i) => i.companyId));

  const targets = companies
    .map((c) => ({
      id: c.id,
      unitCount: c.sites.reduce((sum, s) => sum + s._count.units, 0),
      monthlyPrice: Number(c.package?.monthlyPrice ?? c.customMonthlyPrice ?? 0),
    }))
    .filter((c) => !existingCompanyIds.has(c.id) && c.monthlyPrice > 0);

  if (targets.length === 0) {
    return "Bu dönem için oluşturulacak yeni fatura yok.";
  }

  await prisma.invoice.createMany({
    data: targets.map((c) => ({
      companyId: c.id,
      period: periodDate,
      unitCount: c.unitCount,
      amount: c.monthlyPrice,
    })),
  });

  revalidatePath("/superadmin/invoices");
}

export async function toggleInvoicePaidAction(invoiceId: string) {
  await requireRole("SUPER_ADMIN");

  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const nextStatus = invoice.status === "ODENDI" ? "BEKLIYOR" : "ODENDI";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: nextStatus, paidAt: nextStatus === "ODENDI" ? new Date() : null },
  });

  revalidatePath("/superadmin/invoices");
}
