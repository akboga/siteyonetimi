import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { getDuesPaymentReport } from "@/lib/reports";
import { generateDuesPaymentReportPdf } from "@/lib/site-reports-pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  const periodParam = searchParams.get("period");
  const blockId = searchParams.get("blockId") || undefined;
  if (!siteId || !periodParam || !/^\d{4}-\d{2}$/.test(periodParam)) {
    return NextResponse.json({ error: "siteId ve period (YYYY-AA) zorunludur." }, { status: 400 });
  }

  const user = await requireCompanyUser();
  const site = await assertSiteAccess(user, siteId);

  if (blockId) {
    const block = await prisma.block.findUnique({ where: { id: blockId }, select: { siteId: true } });
    if (!block || block.siteId !== siteId) {
      return NextResponse.json({ error: "Geçersiz blok seçimi." }, { status: 400 });
    }
  }

  const period = new Date(`${periodParam}-01T00:00:00.000Z`);
  const [report, company] = await Promise.all([
    getDuesPaymentReport(siteId, period, blockId),
    prisma.company.findUniqueOrThrow({ where: { id: site.companyId }, select: { name: true, logoUrl: true } }),
  ]);

  const pdfBytes = await generateDuesPaymentReportPdf(report, company, period);

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="aidat-raporu-${periodParam}.pdf"`,
    },
  });
}
