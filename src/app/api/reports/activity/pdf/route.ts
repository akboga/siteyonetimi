import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { getMonthlyActivityReport } from "@/lib/reports";
import { generateMonthlyActivityReportPdf } from "@/lib/site-reports-pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  const periodParam = searchParams.get("period");
  if (!siteId || !periodParam || !/^\d{4}-\d{2}$/.test(periodParam)) {
    return NextResponse.json({ error: "siteId ve period (YYYY-AA) zorunludur." }, { status: 400 });
  }

  const user = await requireCompanyUser();
  const site = await assertSiteAccess(user, siteId);

  const period = new Date(`${periodParam}-01T00:00:00.000Z`);
  const [report, company] = await Promise.all([
    getMonthlyActivityReport(siteId, period),
    prisma.company.findUniqueOrThrow({ where: { id: site.companyId }, select: { name: true, logoUrl: true } }),
  ]);

  const pdfBytes = await generateMonthlyActivityReportPdf(report, company, period);

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="faaliyet-raporu-${periodParam}.pdf"`,
    },
  });
}
