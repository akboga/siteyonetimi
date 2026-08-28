import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { CurrentUser } from "@/lib/session";

/** Kullanıcının erişebildiği site id listesi. COMPANY_ADMIN → şirketin tüm siteleri. */
export async function getAccessibleSiteIds(user: CurrentUser & { companyId: string }): Promise<string[]> {
  if (user.role === "COMPANY_ADMIN") {
    const sites = await prisma.site.findMany({
      where: { companyId: user.companyId },
      select: { id: true },
    });
    return sites.map((s) => s.id);
  }

  const access = await prisma.userSiteAccess.findMany({
    where: { userId: user.id },
    select: { siteId: true },
  });
  return access.map((a) => a.siteId);
}

/**
 * Verilen site kullanıcının şirketine ait mi ve (COMPANY_STAFF ise) erişimi var mı kontrol eder.
 * Değilse 404 döner — böylece başka bir şirketin verisi hiçbir şekilde sızmaz.
 */
export async function assertSiteAccess(
  user: CurrentUser & { companyId: string },
  siteId: string,
) {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site || site.companyId !== user.companyId) notFound();

  if (user.role === "COMPANY_STAFF") {
    const access = await prisma.userSiteAccess.findUnique({
      where: { userId_siteId: { userId: user.id, siteId } },
    });
    if (!access) notFound();
  }

  return site;
}
