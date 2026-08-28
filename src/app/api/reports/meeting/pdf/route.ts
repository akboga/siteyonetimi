import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { getMeetingReport } from "@/lib/reports";
import { generateMeetingReportPdf } from "@/lib/site-reports-pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get("meetingId");
  if (!meetingId) {
    return NextResponse.json({ error: "meetingId zorunludur." }, { status: 400 });
  }

  const user = await requireCompanyUser();

  const meeting = await getMeetingReport(meetingId).catch(() => null);
  if (!meeting) {
    return NextResponse.json({ error: "Toplantı bulunamadı." }, { status: 404 });
  }
  await assertSiteAccess(user, meeting.siteId);

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: meeting.site.companyId },
    select: { name: true, logoUrl: true },
  });

  const pdfBytes = await generateMeetingReportPdf(meeting, company);

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="toplanti-raporu-${meeting.id}.pdf"`,
    },
  });
}
