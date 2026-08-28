import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { generateSubscriptionInvoicePdf } from "@/lib/subscription-invoice-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
  const user = await requireRole("COMPANY_ADMIN", "SUPER_ADMIN");

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { company: { include: { package: true } } },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Fatura bulunamadı." }, { status: 404 });
  }
  if (user.role === "COMPANY_ADMIN" && invoice.companyId !== user.companyId) {
    return NextResponse.json({ error: "Bu faturaya erişiminiz yok." }, { status: 403 });
  }

  const pdfBytes = await generateSubscriptionInvoicePdf({
    invoiceNo: `FTR-${invoice.id.slice(-8).toUpperCase()}`,
    companyName: invoice.company.name,
    companyLogoUrl: invoice.company.logoUrl,
    packageName: invoice.company.package?.name,
    period: invoice.period,
    unitCount: invoice.unitCount,
    amount: Number(invoice.amount),
    status: invoice.status,
    paidAt: invoice.paidAt,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="fatura-${invoice.id}.pdf"`,
    },
  });
}
