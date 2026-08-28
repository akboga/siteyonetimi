import { prisma } from "@/lib/db";

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Verilen dönemde (ayın başı) sitenin geçerli aidat tarifesini döner — yoksa null. */
export async function getActiveDuesRate(siteId: string, period: Date) {
  return prisma.siteDuesRate.findFirst({
    where: {
      siteId,
      validFrom: { lte: period },
      OR: [{ validTo: null }, { validTo: { gt: period } }],
    },
    orderBy: { validFrom: "desc" },
  });
}

export type MonthlyDuesGenerationResult = {
  period: string;
  sitesProcessed: number;
  unitsCreated: number;
  sitesSkippedNoRate: string[];
};

/**
 * Her site için, verilen dönemde (varsayılan: içinde bulunulan ay) tanımlı aidat tarifesi varsa,
 * o dönem için henüz aidat kaydı olmayan HER daireye (boş olsa dahi) tarife tutarında bir
 * DuesRecord oluşturur. Aynı ay için tekrar çalıştırılması güvenlidir (mevcut kayıtlar atlanır,
 * DuesRecord.unitId+period üzerindeki benzersizlik kısıtı da bunu garanti eder).
 */
export async function generateMonthlyDuesForAllSites(period: Date = startOfMonth(new Date())): Promise<MonthlyDuesGenerationResult> {
  const normalizedPeriod = startOfMonth(period);
  const sites = await prisma.site.findMany({ select: { id: true } });

  const result: MonthlyDuesGenerationResult = {
    period: normalizedPeriod.toISOString().slice(0, 7),
    sitesProcessed: 0,
    unitsCreated: 0,
    sitesSkippedNoRate: [],
  };

  for (const site of sites) {
    const rate = await getActiveDuesRate(site.id, normalizedPeriod);
    if (!rate) {
      result.sitesSkippedNoRate.push(site.id);
      continue;
    }

    const units = await prisma.unit.findMany({ where: { siteId: site.id }, select: { id: true } });
    if (units.length === 0) {
      result.sitesProcessed += 1;
      continue;
    }

    const existing = await prisma.duesRecord.findMany({
      where: { unitId: { in: units.map((u) => u.id) }, period: normalizedPeriod },
      select: { unitId: true },
    });
    const existingUnitIds = new Set(existing.map((e) => e.unitId));
    const targets = units.filter((u) => !existingUnitIds.has(u.id));

    if (targets.length > 0) {
      const created = await prisma.duesRecord.createMany({
        data: targets.map((u) => ({ unitId: u.id, period: normalizedPeriod, amount: rate.amount })),
        skipDuplicates: true,
      });
      result.unitsCreated += created.count;
    }
    result.sitesProcessed += 1;
  }

  return result;
}
