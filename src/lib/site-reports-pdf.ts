import type { TicketPriority, TicketStatus } from "@/generated/prisma/enums";
import { PdfReportBuilder, formatReportDate } from "@/lib/pdf-report";
import type { getDuesPaymentReport, getMonthlyActivityReport, getMeetingReport } from "@/lib/reports";

const currencyFormatter = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatCurrency = (n: number) => `${currencyFormatter.format(n)} TL`;
const periodFormatter = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });

const DUES_STATUS_LABELS: Record<string, string> = {
  ODENDI: "Ödendi",
  KISMI: "Kısmi Ödendi",
  ODENMEDI: "Ödenmedi",
  TAHAKKUK_YOK: "Tahakkuk Yok",
};

const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  DUSUK: "Düşük",
  ORTA: "Orta",
  YUKSEK: "Yüksek",
  ACIL: "Acil",
};
const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  ACIK: "Açık",
  ISLEMDE: "İşlemde",
  COZULDU: "Çözüldü",
  IPTAL: "İptal",
};

type CompanyInfo = { name: string; logoUrl?: string | null };

export async function generateDuesPaymentReportPdf(
  report: Awaited<ReturnType<typeof getDuesPaymentReport>>,
  company: CompanyInfo,
  period: Date,
) {
  const pdf = await PdfReportBuilder.create();
  await pdf.setHeader({
    companyName: company.name,
    companyLogoUrl: company.logoUrl,
    title: "Aidat Ödeme Raporu",
    subtitle: `${report.siteName}${report.blockName ? ` / ${report.blockName}` : ""} — ${periodFormatter.format(period)}`,
  });

  pdf.sectionTitle("Özet");
  pdf.keyValueRow("Toplam Daire", String(report.rows.length));
  pdf.keyValueRow("Ödendi", String(report.paidCount));
  pdf.keyValueRow("Kısmi Ödendi", String(report.partialCount));
  pdf.keyValueRow("Ödenmedi", String(report.unpaidCount));
  pdf.keyValueRow("Tahakkuk Yok", String(report.noChargeCount));
  pdf.spacer(4);
  pdf.keyValueRow("Toplam Tahakkuk", formatCurrency(report.totals.amount), { valueBold: true });
  pdf.keyValueRow("Toplam Tahsilat", formatCurrency(report.totals.paid), { valueBold: true });
  pdf.keyValueRow("Toplam Bakiye", formatCurrency(report.totals.balance), { valueBold: true });
  pdf.spacer(10);

  pdf.sectionTitle("Daire Bazlı Durum");
  if (report.rows.length === 0) {
    pdf.emptyState(report.blockName ? "Bu blokta kayıtlı daire yok." : "Sitede kayıtlı daire yok.");
  } else {
    pdf.table(
      [
        { label: "Daire", width: 90 },
        { label: "Tahakkuk", width: 90, align: "right" },
        { label: "Tahsilat", width: 90, align: "right" },
        { label: "Bakiye", width: 90, align: "right" },
        { label: "Son Ödeme", width: 75, align: "right" },
        { label: "Durum", width: 80, align: "right" },
      ],
      report.rows.map((r) => [
        r.unitLabel,
        formatCurrency(r.amount),
        formatCurrency(r.paidAmount),
        formatCurrency(r.balance),
        formatReportDate(r.lastPaymentDate),
        DUES_STATUS_LABELS[r.status],
      ]),
    );
  }

  return pdf.save();
}

export async function generateMonthlyActivityReportPdf(
  report: Awaited<ReturnType<typeof getMonthlyActivityReport>>,
  company: CompanyInfo,
  period: Date,
) {
  const pdf = await PdfReportBuilder.create();
  await pdf.setHeader({
    companyName: company.name,
    companyLogoUrl: company.logoUrl,
    title: "Aylık Faaliyet Raporu",
    subtitle: `${report.siteName} — ${periodFormatter.format(period)}`,
  });

  pdf.sectionTitle("Özet");
  pdf.keyValueRow("Açılan Arıza/Talep", String(report.totals.ticketsOpened));
  pdf.keyValueRow("Çözülen Arıza/Talep", String(report.totals.ticketsResolved));
  pdf.keyValueRow("Bakım İşlemi Sayısı", String(report.totals.maintenanceCount));
  pdf.keyValueRow("Toplam Gider", formatCurrency(report.totals.expenseTotal), { valueBold: true });
  pdf.spacer(10);

  pdf.sectionTitle("Arıza / Talepler");
  if (report.tickets.length === 0) {
    pdf.emptyState("Bu ay arıza/talep kaydı yok.");
  } else {
    pdf.table(
      [
        { label: "Kategori", width: 100 },
        { label: "Daire", width: 70 },
        { label: "Öncelik", width: 60 },
        { label: "Durum", width: 65 },
        { label: "Açılış", width: 70, align: "right" },
        { label: "Kapanış", width: 70, align: "right" },
      ],
      report.tickets.map((t) => [
        t.category,
        t.unitLabel,
        TICKET_PRIORITY_LABELS[t.priority],
        TICKET_STATUS_LABELS[t.status],
        formatReportDate(t.openedAt),
        formatReportDate(t.closedAt),
      ]),
    );
  }
  pdf.spacer(10);

  pdf.sectionTitle("Bakım İşlemleri");
  if (report.maintenanceLogs.length === 0) {
    pdf.emptyState("Bu ay bakım kaydı yok.");
  } else {
    pdf.table(
      [
        { label: "Ekipman", width: 140 },
        { label: "Tarih", width: 80, align: "right" },
        { label: "Yapan", width: 140 },
        { label: "Tutar", width: 105, align: "right" },
      ],
      report.maintenanceLogs.map((m) => [
        m.equipment,
        formatReportDate(m.performedDate),
        m.performedBy ?? "—",
        m.cost ? formatCurrency(m.cost) : "—",
      ]),
    );
  }
  pdf.spacer(10);

  pdf.sectionTitle("Giderler");
  if (report.expenses.length === 0) {
    pdf.emptyState("Bu ay gider kaydı yok.");
  } else {
    pdf.table(
      [
        { label: "Kategori", width: 120 },
        { label: "Tarih", width: 70, align: "right" },
        { label: "Açıklama", width: 210 },
        { label: "Tutar", width: 90, align: "right" },
      ],
      report.expenses.map((e) => [e.category, formatReportDate(e.date), e.description ?? "—", formatCurrency(e.amount)]),
    );
  }
  pdf.spacer(10);

  pdf.sectionTitle("Duyurular");
  if (report.announcements.length === 0) {
    pdf.emptyState("Bu ay yayınlanan duyuru yok.");
  } else {
    pdf.table(
      [
        { label: "Başlık", width: 385 },
        { label: "Tarih", width: 130, align: "right" },
      ],
      report.announcements.map((a) => [a.title, formatReportDate(a.publishDate)]),
    );
  }

  return pdf.save();
}

export async function generateMeetingReportPdf(
  meeting: Awaited<ReturnType<typeof getMeetingReport>>,
  company: CompanyInfo,
) {
  const pdf = await PdfReportBuilder.create();
  await pdf.setHeader({
    companyName: company.name,
    companyLogoUrl: company.logoUrl,
    title: "Toplantı Raporu",
    subtitle: `${meeting.site.name} — ${formatReportDate(meeting.date)}`,
  });

  pdf.sectionTitle("Toplantı Bilgileri");
  pdf.keyValueRow("Tarih", formatReportDate(meeting.date));
  pdf.spacer(10);

  pdf.sectionTitle("Gündem");
  if (meeting.agenda) pdf.paragraph(meeting.agenda);
  else pdf.emptyState("Gündem girilmemiş.");
  pdf.spacer(10);

  pdf.sectionTitle("Katılımcılar");
  if (meeting.participants) pdf.paragraph(meeting.participants);
  else pdf.emptyState("Katılımcı bilgisi girilmemiş.");
  pdf.spacer(10);

  pdf.sectionTitle("Tutanak");
  if (meeting.minutesText) pdf.paragraph(meeting.minutesText);
  else pdf.emptyState("Tutanak metni girilmemiş.");
  pdf.spacer(10);

  pdf.sectionTitle(`Kararlar (${meeting.decisions.length})`);
  if (meeting.decisions.length === 0) {
    pdf.emptyState("Bu toplantıya bağlı karar kaydı yok.");
  } else {
    for (const decision of meeting.decisions) {
      pdf.keyValueRow(`Karar No: ${decision.decisionNumber}`, formatReportDate(decision.date));
      pdf.paragraph(decision.text);
      pdf.spacer(8);
    }
  }

  return pdf.save();
}
