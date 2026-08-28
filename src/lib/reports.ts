import { prisma } from "@/lib/db";
import { getAccessibleSiteIds } from "@/lib/permissions";
import type { CurrentUser } from "@/lib/session";
import { calculateLateFee, monthsOverdue } from "@/lib/late-fee";

function toNumber(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Şirket geneli özet: siteler, daireler, sakinler, açık talepler, güncel dönem tahsilat oranı. */
export async function getCompanyOverview(user: CurrentUser & { companyId: string }) {
  const siteIds = await getAccessibleSiteIds(user);

  const [unitCount, residentCount, openTicketCount, currentPeriodDues, outstandingDues] = await Promise.all([
    prisma.unit.count({ where: { siteId: { in: siteIds } } }),
    prisma.resident.count({ where: { unit: { siteId: { in: siteIds } }, isActive: true } }),
    prisma.ticket.count({ where: { siteId: { in: siteIds }, status: { in: ["ACIK", "ISLEMDE"] } } }),
    prisma.duesRecord.aggregate({
      where: { unit: { siteId: { in: siteIds } }, period: startOfMonth(new Date()) },
      _sum: { amount: true, paidAmount: true },
    }),
    prisma.duesRecord.aggregate({
      where: { unit: { siteId: { in: siteIds } } },
      _sum: { amount: true, paidAmount: true },
    }),
  ]);

  const accrued = toNumber(currentPeriodDues._sum.amount);
  const collected = toNumber(currentPeriodDues._sum.paidAmount);

  return {
    siteCount: siteIds.length,
    unitCount,
    residentCount,
    openTicketCount,
    currentPeriodAccrued: accrued,
    currentPeriodCollected: collected,
    currentPeriodCollectionRate: accrued > 0 ? Math.round((collected / accrued) * 1000) / 10 : 0,
    totalOutstanding: toNumber(outstandingDues._sum.amount) - toNumber(outstandingDues._sum.paidAmount),
  };
}

/** Site bazlı aidat tahakkuk/tahsilat/gider özeti (verilen yıl için ay bazlı kırılım). */
export async function getSiteFinancialSummary(siteId: string, year: number) {
  const rangeStart = new Date(Date.UTC(year, 0, 1));
  const rangeEnd = new Date(Date.UTC(year + 1, 0, 1));

  const [duesRecords, expenses] = await Promise.all([
    prisma.duesRecord.findMany({
      where: { unit: { siteId }, period: { gte: rangeStart, lt: rangeEnd } },
      select: { period: true, amount: true, paidAmount: true },
    }),
    prisma.expense.findMany({
      where: { siteId, date: { gte: rangeStart, lt: rangeEnd } },
      select: { date: true, amount: true },
    }),
  ]);

  const monthly = new Map<string, { period: string; accrued: number; collected: number; expenses: number }>();
  for (let m = 0; m < 12; m++) {
    const key = monthKey(new Date(Date.UTC(year, m, 1)));
    monthly.set(key, { period: key, accrued: 0, collected: 0, expenses: 0 });
  }

  for (const record of duesRecords) {
    const entry = monthly.get(monthKey(record.period));
    if (!entry) continue;
    entry.accrued += toNumber(record.amount);
    entry.collected += toNumber(record.paidAmount);
  }
  for (const expense of expenses) {
    const entry = monthly.get(monthKey(expense.date));
    if (!entry) continue;
    entry.expenses += toNumber(expense.amount);
  }

  const months = Array.from(monthly.values());
  const totals = months.reduce(
    (acc, m) => ({
      accrued: acc.accrued + m.accrued,
      collected: acc.collected + m.collected,
      expenses: acc.expenses + m.expenses,
    }),
    { accrued: 0, collected: 0, expenses: 0 },
  );

  return { months, totals, net: totals.collected - totals.expenses };
}

/** Site giderlerinin kategori bazlı dağılımı (verilen yıl için). */
export async function getExpenseBreakdownByCategory(siteId: string, year: number) {
  const rangeStart = new Date(Date.UTC(year, 0, 1));
  const rangeEnd = new Date(Date.UTC(year + 1, 0, 1));

  const grouped = await prisma.expense.groupBy({
    by: ["category"],
    where: { siteId, date: { gte: rangeStart, lt: rangeEnd } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  return grouped.map((g) => ({ category: g.category, total: toNumber(g._sum.amount) }));
}

/** Bütçe planlaması: kategori bazlı planlanan tutar vs gerçekleşen gider karşılaştırması (verilen yıl için). */
export async function getBudgetVsActual(siteId: string, year: number) {
  const [budgetItems, actuals] = await Promise.all([
    prisma.budgetItem.findMany({ where: { siteId, year }, orderBy: { category: "asc" } }),
    getExpenseBreakdownByCategory(siteId, year),
  ]);

  const actualByCategory = new Map(actuals.map((a) => [a.category, a.total]));
  const categories = new Set([...budgetItems.map((b) => b.category), ...actuals.map((a) => a.category)]);

  const rows = Array.from(categories)
    .map((category) => {
      const planned = toNumber(budgetItems.find((b) => b.category === category)?.plannedAmount);
      const actual = actualByCategory.get(category) ?? 0;
      return {
        category,
        budgetItemId: budgetItems.find((b) => b.category === category)?.id ?? null,
        planned,
        actual,
        variance: actual - planned,
        remaining: planned - actual,
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category, "tr"));

  const totals = rows.reduce(
    (acc, r) => ({ planned: acc.planned + r.planned, actual: acc.actual + r.actual }),
    { planned: 0, actual: 0 },
  );

  return { rows, totals: { ...totals, variance: totals.actual - totals.planned } };
}

/** Site'nin kasa/banka hesapları ve her biri için güncel bakiye (açılış + giriş - çıkış). */
export async function getBankAccountBalances(siteId: string) {
  const accounts = await prisma.bankAccount.findMany({
    where: { siteId },
    include: { transactions: { select: { amount: true, direction: true } } },
    orderBy: { createdAt: "asc" },
  });

  const withBalance = accounts.map((account) => {
    const totalsByDirection = account.transactions.reduce(
      (acc, t) => {
        const amount = toNumber(t.amount);
        if (t.direction === "GIRIS") acc.in += amount;
        else acc.out += amount;
        return acc;
      },
      { in: 0, out: 0 },
    );
    const opening = toNumber(account.openingBalance);
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      bankName: account.bankName,
      iban: account.iban,
      openingBalance: opening,
      totalIn: totalsByDirection.in,
      totalOut: totalsByDirection.out,
      currentBalance: opening + totalsByDirection.in - totalsByDirection.out,
    };
  });

  return {
    accounts: withBalance,
    totalBalance: withBalance.reduce((sum, a) => sum + a.currentBalance, 0),
  };
}

/**
 * Vadesi geçmiş (ödenmemiş) aidat kayıtları, daire bilgisiyle birlikte.
 * `calculatedLateFee`, sitenin tanımlı oranına göre güncel önizleme faizidir — kayıttaki
 * (uygulanmış) `lateFee` alanından farklı olabilir; uygulamak için `applyCalculatedLateFeesAction` çağrılmalı.
 */
export async function getOverdueDues(siteId: string) {
  const now = new Date();
  const [records, site] = await Promise.all([
    prisma.duesRecord.findMany({
      where: {
        unit: { siteId },
        period: { lt: startOfMonth(now) },
      },
      include: { unit: { select: { id: true, unitNumber: true, block: { select: { name: true } } } } },
      orderBy: { period: "asc" },
    }),
    prisma.site.findUniqueOrThrow({ where: { id: siteId }, select: { lateFeeRatePercent: true } }),
  ]);

  const ratePercent = toNumber(site.lateFeeRatePercent);

  return records
    .map((r) => {
      const outstandingPrincipal = toNumber(r.amount) - toNumber(r.paidAmount);
      return {
        ...r,
        balance: outstandingPrincipal + toNumber(r.lateFee),
        calculatedLateFee: calculateLateFee(outstandingPrincipal, ratePercent, monthsOverdue(r.period, now)),
      };
    })
    .filter((r) => r.balance > 0);
}

/** Arıza/talep durum dağılımı ve ortalama çözüm süresi (saat). */
export async function getTicketStats(siteId: string) {
  const tickets = await prisma.ticket.findMany({
    where: { siteId },
    select: { status: true, openedAt: true, closedAt: true },
  });

  const counts = { ACIK: 0, ISLEMDE: 0, COZULDU: 0, IPTAL: 0 };
  let resolvedDurationMs = 0;
  let resolvedCount = 0;

  for (const t of tickets) {
    counts[t.status] += 1;
    if (t.status === "COZULDU" && t.closedAt) {
      resolvedDurationMs += t.closedAt.getTime() - t.openedAt.getTime();
      resolvedCount += 1;
    }
  }

  return {
    counts,
    total: tickets.length,
    avgResolutionHours: resolvedCount > 0 ? Math.round((resolvedDurationMs / resolvedCount / 3_600_000) * 10) / 10 : null,
  };
}

export type DuesReportRowStatus = "ODENDI" | "KISMI" | "ODENMEDI" | "TAHAKKUK_YOK";

/**
 * Aidat ödeme raporu: verilen site + dönem için (opsiyonel olarak tek bir bloğa daraltılmış)
 * dairelerin ödeme durumu ("kim ödemiş kim ödememiş"). O dönem için tahakkuk kaydı hiç
 * oluşturulmamış daireler de "TAHAKKUK_YOK" olarak listeye dahil edilir. `blockId` verilmezse
 * rapor sitedeki tüm daireleri kapsar; verilirse sadece o bloktaki daireleri kapsar — yönetici
 * her bloğun kendi ilan panosuna asacağı ayrı bir rapor çekebilsin diye.
 */
export async function getDuesPaymentReport(siteId: string, period: Date, blockId?: string) {
  const periodStart = startOfMonth(period);

  const [site, block, units, records] = await Promise.all([
    prisma.site.findUniqueOrThrow({ where: { id: siteId }, select: { name: true } }),
    blockId ? prisma.block.findUniqueOrThrow({ where: { id: blockId }, select: { name: true } }) : null,
    prisma.unit.findMany({
      where: { siteId, ...(blockId ? { blockId } : {}) },
      include: { block: true },
      orderBy: [{ block: { name: "asc" } }, { unitNumber: "asc" }],
    }),
    prisma.duesRecord.findMany({
      where: { unit: { siteId, ...(blockId ? { blockId } : {}) }, period: periodStart },
      include: { payments: { orderBy: { paymentDate: "desc" }, take: 1 } },
    }),
  ]);

  const recordByUnit = new Map(records.map((r) => [r.unitId, r]));

  const rows = units.map((unit) => {
    const unitLabel = `${unit.block ? `${unit.block.name} / ` : ""}${unit.unitNumber}`;
    const record = recordByUnit.get(unit.id);
    if (!record) {
      return {
        unitLabel,
        amount: 0,
        paidAmount: 0,
        balance: 0,
        status: "TAHAKKUK_YOK" as DuesReportRowStatus,
        lastPaymentDate: null as Date | null,
      };
    }
    const amount = toNumber(record.amount) + toNumber(record.lateFee);
    const paidAmount = toNumber(record.paidAmount);
    const status: DuesReportRowStatus = paidAmount <= 0 ? "ODENMEDI" : paidAmount < amount ? "KISMI" : "ODENDI";
    return {
      unitLabel,
      amount,
      paidAmount,
      balance: amount - paidAmount,
      status,
      lastPaymentDate: record.payments[0]?.paymentDate ?? null,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({ amount: acc.amount + r.amount, paid: acc.paid + r.paidAmount, balance: acc.balance + r.balance }),
    { amount: 0, paid: 0, balance: 0 },
  );

  return {
    siteName: site.name,
    blockName: block?.name ?? null,
    rows,
    totals,
    paidCount: rows.filter((r) => r.status === "ODENDI").length,
    partialCount: rows.filter((r) => r.status === "KISMI").length,
    unpaidCount: rows.filter((r) => r.status === "ODENMEDI").length,
    noChargeCount: rows.filter((r) => r.status === "TAHAKKUK_YOK").length,
  };
}

/** Aylık faaliyet raporu: verilen site + dönemde açılan/çözülen arızalar, bakım işlemleri, giderler ve duyurular. */
export async function getMonthlyActivityReport(siteId: string, period: Date) {
  const periodStart = startOfMonth(period);
  const periodEnd = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1));
  const inRange = (d: Date) => d >= periodStart && d < periodEnd;

  const [site, tickets, maintenanceLogs, expenses, announcements] = await Promise.all([
    prisma.site.findUniqueOrThrow({ where: { id: siteId }, select: { name: true, address: true } }),
    prisma.ticket.findMany({
      where: {
        siteId,
        OR: [{ openedAt: { gte: periodStart, lt: periodEnd } }, { closedAt: { gte: periodStart, lt: periodEnd } }],
      },
      include: { unit: { include: { block: true } } },
      orderBy: { openedAt: "asc" },
    }),
    prisma.maintenanceLog.findMany({
      where: { schedule: { siteId }, performedDate: { gte: periodStart, lt: periodEnd } },
      include: { schedule: true },
      orderBy: { performedDate: "asc" },
    }),
    prisma.expense.findMany({
      where: { siteId, date: { gte: periodStart, lt: periodEnd } },
      orderBy: { date: "asc" },
    }),
    prisma.announcement.findMany({
      where: { siteId, publishDate: { gte: periodStart, lt: periodEnd } },
      orderBy: { publishDate: "asc" },
    }),
  ]);

  return {
    siteName: site.name,
    siteAddress: site.address,
    tickets: tickets.map((t) => ({
      category: t.category,
      description: t.description,
      unitLabel: t.unit ? `${t.unit.block ? `${t.unit.block.name} / ` : ""}${t.unit.unitNumber}` : "—",
      priority: t.priority,
      status: t.status,
      openedAt: t.openedAt,
      closedAt: t.closedAt,
      openedThisMonth: inRange(t.openedAt),
      closedThisMonth: t.closedAt ? inRange(t.closedAt) : false,
    })),
    maintenanceLogs: maintenanceLogs.map((m) => ({
      equipment: m.schedule.equipment,
      performedDate: m.performedDate,
      performedBy: m.performedBy,
      cost: toNumber(m.cost),
      notes: m.notes,
    })),
    expenses: expenses.map((e) => ({ category: e.category, amount: toNumber(e.amount), date: e.date, description: e.description })),
    announcements: announcements.map((a) => ({ title: a.title, publishDate: a.publishDate })),
    totals: {
      ticketsOpened: tickets.filter((t) => inRange(t.openedAt)).length,
      ticketsResolved: tickets.filter((t) => t.closedAt && inRange(t.closedAt)).length,
      expenseTotal: expenses.reduce((sum, e) => sum + toNumber(e.amount), 0),
      maintenanceCount: maintenanceLogs.length,
    },
  };
}

/** Toplantı/karar raporu: bir toplantının tüm detayları ve kendisine bağlı kararlar. */
export async function getMeetingReport(meetingId: string) {
  return prisma.meeting.findUniqueOrThrow({
    where: { id: meetingId },
    include: {
      site: { select: { name: true, address: true, companyId: true } },
      decisions: { orderBy: { date: "asc" } },
    },
  });
}

/** Önümüzdeki `withinDays` gün içinde vadesi gelen periyodik bakımlar. */
export async function getUpcomingMaintenance(siteId: string, withinDays = 30) {
  const now = new Date();
  const until = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  return prisma.maintenanceSchedule.findMany({
    where: { siteId, nextDueDate: { gte: now, lte: until } },
    orderBy: { nextDueDate: "asc" },
  });
}
