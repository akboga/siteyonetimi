import Link from "next/link";
import { ChevronLeft, ChevronRight, Building2, DoorOpen, Users, AlertCircle, FileDown } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/permissions";
import { getCompanyOverview, getSiteFinancialSummary } from "@/lib/reports";
import { formatCurrency, formatDate, toMonthInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListFilter } from "@/components/list-filter";
import { PrintButton } from "@/components/print-button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; siteId?: string }>;
}) {
  const user = await requireCompanyUser();
  const { year: yearParam, siteId: siteIdParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();

  const [overview, siteIds, company] = await Promise.all([
    getCompanyOverview(user),
    getAccessibleSiteIds(user),
    prisma.company.findUniqueOrThrow({ where: { id: user.companyId }, select: { name: true, logoUrl: true } }),
  ]);

  const sites = await prisma.site.findMany({
    where: { id: { in: siteIds } },
    orderBy: { name: "asc" },
  });

  const selectedSiteId = siteIdParam && siteIds.includes(siteIdParam) ? siteIdParam : sites[0]?.id;
  const [meetings, blocks] = selectedSiteId
    ? await Promise.all([
        prisma.meeting.findMany({
          where: { siteId: selectedSiteId },
          orderBy: { date: "desc" },
          select: { id: true, date: true },
        }),
        prisma.block.findMany({
          where: { siteId: selectedSiteId },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
      ])
    : [[], []];

  const siteSummaries = await Promise.all(
    sites.map(async (site) => ({
      site,
      summary: await getSiteFinancialSummary(site.id, year),
    })),
  );

  const currentMonthValue = toMonthInputValue(new Date());

  const stats = [
    { label: "Toplam Site", value: overview.siteCount, icon: Building2 },
    { label: "Toplam Daire", value: overview.unitCount, icon: DoorOpen },
    { label: "Kayıtlı Sakin", value: overview.residentCount, icon: Users },
    { label: "Açık Talep", value: overview.openTicketCount, icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Yazdırma çıktısında görünen başlık — şirket logosu/adı ve rapor tarihi */}
      <div className="hidden items-center justify-between border-b pb-4 print:flex">
        <div className="flex items-center gap-3">
          {company.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- yazdırma çıktısı, next/image gerekmiyor
            <img src={company.logoUrl} alt={company.name} className="h-10 w-auto object-contain" />
          )}
          <div>
            <p className="font-semibold">{company.name}</p>
            <p className="text-xs text-muted-foreground">{year} Yılı Finansal Raporu</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Oluşturulma: {formatDate(new Date())}</p>
      </div>

      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Raporlar</h1>
          <p className="text-sm text-muted-foreground">Şirket geneli özet ve site bazlı finansal karşılaştırma</p>
        </div>
        <PrintButton />
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Rapor Oluştur</CardTitle>
          <CardDescription>Seçtiğiniz siteye özel, PDF olarak indirilebilir raporlar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Site</span>
            <ListFilter
              paramName="siteId"
              label="Site seçin"
              options={sites.map((site) => ({ value: site.id, label: site.name }))}
            />
          </div>

          {!selectedSiteId ? (
            <p className="text-sm text-muted-foreground">Rapor oluşturmak için erişebildiğiniz bir site olmalı.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-3 rounded-xl border p-4">
                <div>
                  <p className="text-sm font-medium">Aidat Ödeme Raporu</p>
                  <p className="text-xs text-muted-foreground">
                    Seçilen ayda kim ödemiş, kim ödememiş — bloğa göre daraltılabilir
                  </p>
                </div>
                <form
                  action="/api/reports/dues/pdf"
                  method="GET"
                  target="_blank"
                  className="space-y-2"
                >
                  <input type="hidden" name="siteId" value={selectedSiteId} />
                  <Label htmlFor="dues-period" className="sr-only">
                    Dönem
                  </Label>
                  <Input
                    id="dues-period"
                    type="month"
                    name="period"
                    defaultValue={currentMonthValue}
                    required
                    className="h-9"
                  />
                  {blocks.length > 0 && (
                    <Select name="blockId" defaultValue="" items={{ "": "Tüm Bloklar", ...Object.fromEntries(blocks.map((b) => [b.id, b.name])) }}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tüm Bloklar</SelectItem>
                        {blocks.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button type="submit" size="sm" variant="outline" className="w-full">
                    <FileDown className="size-4" />
                    PDF
                  </Button>
                </form>
              </div>

              <div className="space-y-3 rounded-xl border p-4">
                <div>
                  <p className="text-sm font-medium">Aylık Faaliyet Raporu</p>
                  <p className="text-xs text-muted-foreground">O ay yapılan işler, arızalar, bakım ve giderler</p>
                </div>
                <form
                  action="/api/reports/activity/pdf"
                  method="GET"
                  target="_blank"
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="siteId" value={selectedSiteId} />
                  <Label htmlFor="activity-period" className="sr-only">
                    Dönem
                  </Label>
                  <Input
                    id="activity-period"
                    type="month"
                    name="period"
                    defaultValue={currentMonthValue}
                    required
                    className="h-9"
                  />
                  <Button type="submit" size="sm" variant="outline">
                    <FileDown className="size-4" />
                    PDF
                  </Button>
                </form>
              </div>

              <div className="space-y-3 rounded-xl border p-4">
                <div>
                  <p className="text-sm font-medium">Toplantı Raporu</p>
                  <p className="text-xs text-muted-foreground">Seçili toplantının tüm detayları ve kararları</p>
                </div>
                {meetings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Bu sitede toplantı kaydı yok.</p>
                ) : (
                  <form
                    action="/api/reports/meeting/pdf"
                    method="GET"
                    target="_blank"
                    className="flex items-center gap-2"
                  >
                    <Select name="meetingId" defaultValue={meetings[0].id} items={Object.fromEntries(meetings.map((m) => [m.id, formatDate(m.date)]))}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {meetings.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {formatDate(m.date)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="submit" size="sm" variant="outline">
                      <FileDown className="size-4" />
                      PDF
                    </Button>
                  </form>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">Bu Ay Tahsilat Oranı</p>
          <p className="mt-1 text-2xl font-semibold">%{overview.currentPeriodCollectionRate.toLocaleString("tr-TR")}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(overview.currentPeriodCollected)} / {formatCurrency(overview.currentPeriodAccrued)}
          </p>
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">Toplam Bakiye (Tüm Dönemler)</p>
          <p className="mt-1 text-2xl font-semibold text-destructive">{formatCurrency(overview.totalOutstanding)}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 print:hidden">
        <Button
          variant="outline"
          size="icon-sm"
          render={<Link href={`/reports?year=${year - 1}`} aria-label="Önceki yıl" />}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-lg font-semibold tabular-nums">{year}</span>
        <Button
          variant="outline"
          size="icon-sm"
          render={<Link href={`/reports?year=${year + 1}`} aria-label="Sonraki yıl" />}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Site</TableHead>
            <TableHead>Tahakkuk</TableHead>
            <TableHead>Tahsilat</TableHead>
            <TableHead>Tahsilat Oranı</TableHead>
            <TableHead>Gider</TableHead>
            <TableHead>Net</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {siteSummaries.map(({ site, summary }) => {
            const rate = summary.totals.accrued > 0
              ? Math.round((summary.totals.collected / summary.totals.accrued) * 1000) / 10
              : 0;
            return (
              <TableRow key={site.id}>
                <TableCell className="font-medium">
                  <Link href={`/sites/${site.id}`} className="hover:underline">
                    {site.name}
                  </Link>
                </TableCell>
                <TableCell>{formatCurrency(summary.totals.accrued)}</TableCell>
                <TableCell>{formatCurrency(summary.totals.collected)}</TableCell>
                <TableCell>%{rate.toLocaleString("tr-TR")}</TableCell>
                <TableCell>{formatCurrency(summary.totals.expenses)}</TableCell>
                <TableCell className={cn("font-medium", summary.net < 0 && "text-destructive")}>
                  {formatCurrency(summary.net)}
                </TableCell>
              </TableRow>
            );
          })}
          {siteSummaries.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Erişebildiğiniz site yok.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
