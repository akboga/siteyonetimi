import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { generateDuesReceiptPdf } from "@/lib/receipt-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await params;
  const user = await requireCompanyUser();

  const payment = await prisma.duesPayment.findUnique({
    where: { id: paymentId },
    include: {
      duesRecord: {
        include: {
          unit: {
            include: { block: true, site: { include: { company: true } } },
          },
        },
      },
    },
  });
  if (!payment) {
    return NextResponse.json({ error: "Ödeme kaydı bulunamadı." }, { status: 404 });
  }

  const { duesRecord } = payment;
  const { unit } = duesRecord;
  const { site } = unit;
  await assertSiteAccess(user, site.id);

  const unitLabel = unit.block ? `${unit.block.name} / Daire ${unit.unitNumber}` : `Daire ${unit.unitNumber}`;

  const pdfBytes = await generateDuesReceiptPdf({
    receiptNo: `MKB-${payment.id.slice(-8).toUpperCase()}`,
    companyName: site.company.name,
    companyLogoUrl: site.company.logoUrl,
    siteName: site.name,
    siteAddress: site.address,
    unitLabel,
    period: duesRecord.period,
    paymentAmount: Number(payment.amount),
    paymentDate: payment.paymentDate,
    paymentMethod: payment.paymentMethod,
    totalDue: Number(duesRecord.amount) + Number(duesRecord.lateFee),
    totalPaid: Number(duesRecord.paidAmount),
    remainingBalance: Number(duesRecord.amount) + Number(duesRecord.lateFee) - Number(duesRecord.paidAmount),
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="makbuz-${payment.id}.pdf"`,
    },
  });
}
