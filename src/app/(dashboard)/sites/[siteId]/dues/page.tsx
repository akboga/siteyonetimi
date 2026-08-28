import Link from "next/link";
import { FileText, Plus, RefreshCw, ReceiptText } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { getOverdueDues } from "@/lib/reports";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/format";
import {
  generateDuesForSiteAction,
  recordDuesPaymentAction,
  deleteDuesRecordAction,
  applyCalculatedLateFeesAction,
} from "@/actions/dues";
import { SiteSubNav } from "@/components/site-sub-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ListSearch } from "@/components/list-search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const paymentMethodLabels: Record<string, string> = {
  NAKIT: "Nakit",
  HAVALE: "Havale",
  EFT: "EFT",
  DIGER: "Diğer",
};

export default async function SiteDuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ unit?: string }>;
}) {
  const { siteId } = await params;
  const { unit: unitQuery } = await searchParams;
  const user = await requireCompanyUser();
  const site = await assertSiteAccess(user, siteId);

  const [allOverdue, recentPayments] = await Promise.all([
    getOverdueDues(siteId),
    prisma.duesPayment.findMany({
      where: { duesRecord: { unit: { siteId } } },
      orderBy: { paymentDate: "desc" },
      take: 15,
      include: { duesRecord: { include: { unit: { include: { block: true } } } } },
    }),
  ]);

  const totalOutstanding = allOverdue.reduce((sum, r) => sum + r.balance, 0);

  const overdue = unitQuery
    ? allOverdue.filter((r) => {
        const label = `${r.unit.block ? `${r.unit.block.name} ` : ""}${r.unit.unitNumber}`;
        return label.toLowerCase().includes(unitQuery.toLowerCase());
      })
    : allOverdue;

  async function updateLateFees() {
    "use server";
    await applyCalculatedLateFeesAction(siteId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Aidat Takibi</h1>
          <p className="text-sm text-muted-foreground">{site.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={updateLateFees}>
            <Button type="submit" variant="outline" size="sm">
              <RefreshCw className="size-4" />
              Gecikme Faizini Güncelle
            </Button>
          </form>
          <FormDialog
            triggerLabel={
              <>
                <Plus className="size-4" />
                Manuel Tahakkuk (İstisna)
              </>
            }
            title="Manuel Aidat Tahakkuku"
            description="Aylık aidat normalde her ayın 1'inde otomatik oluşturulur. Bu form yalnızca mücbir sebep/istisna durumlar için manuel tahakkuk girmeye yarar — seçilen dönem için, henüz kaydı olmayan tüm dairelere burada girilen tutarda tahakkuk oluşturulur."
            action={generateDuesForSiteAction.bind(null, siteId)}
            submitLabel="Tahakkuk Oluştur"
          >
            <div className="space-y-2">
              <Label htmlFor="period">Dönem</Label>
              <Input id="period" name="period" type="month" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Tutar (₺)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
            </div>
          </FormDialog>
        </div>
      </div>

      <SiteSubNav siteId={siteId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">Vadesi Geçmiş Toplam Bakiye</p>
          <p className="mt-1 text-2xl font-semibold text-destructive">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">Vadesi Geçmiş Kayıt Sayısı</p>
          <p className="mt-1 text-2xl font-semibold">{allOverdue.length}</p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium">Vadesi Geçmiş Aidatlar</h2>
          <ListSearch paramName="unit" placeholder="Daire ara…" className="sm:w-48" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Daire</TableHead>
              <TableHead>Dönem</TableHead>
              <TableHead>Tutar</TableHead>
              <TableHead>Ödenen</TableHead>
              <TableHead>Gecikme Faizi</TableHead>
              <TableHead>Bakiye</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overdue.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">
                  <Link href={`/units/${record.unit.id}`} className="hover:underline">
                    {record.unit.block ? `${record.unit.block.name} / ` : ""}
                    {record.unit.unitNumber}
                  </Link>
                </TableCell>
                <TableCell>{formatPeriod(record.period)}</TableCell>
                <TableCell>{formatCurrency(Number(record.amount))}</TableCell>
                <TableCell>{formatCurrency(Number(record.paidAmount))}</TableCell>
                <TableCell>
                  {formatCurrency(Number(record.lateFee))}
                  {Math.abs(record.calculatedLateFee - Number(record.lateFee)) > 0.01 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (güncel: {formatCurrency(record.calculatedLateFee)})
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-medium text-destructive">
                  {formatCurrency(record.balance)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <FormDialog
                      triggerLabel="Öde"
                      triggerVariant="outline"
                      title="Ödeme Kaydet"
                      description={`${record.unit.block ? `${record.unit.block.name} / ` : ""}${record.unit.unitNumber} · ${formatPeriod(record.period)}`}
                      action={recordDuesPaymentAction.bind(null, record.unit.id, record.id)}
                      submitLabel="Ödemeyi Kaydet"
                    >
                      <div className="space-y-2">
                        <Label htmlFor={`paidAmount-${record.id}`}>Ödeme Tutarı (₺)</Label>
                        <Input
                          id={`paidAmount-${record.id}`}
                          name="paidAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`paymentDate-${record.id}`}>Ödeme Tarihi</Label>
                        <Input
                          id={`paymentDate-${record.id}`}
                          name="paymentDate"
                          type="date"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`paymentMethod-${record.id}`}>Ödeme Yöntemi</Label>
                        <Select name="paymentMethod" defaultValue="HAVALE" items={paymentMethodLabels}>
                          <SelectTrigger id={`paymentMethod-${record.id}`} className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(paymentMethodLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </FormDialog>
                    <form action={deleteDuesRecordAction.bind(null, record.unit.id, record.id)}>
                      <ConfirmSubmitButton confirmMessage="Bu aidat kaydını silmek istediğinize emin misiniz?">
                        Sil
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {overdue.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ReceiptText className="size-6" />
                    <span>
                      {unitQuery
                        ? "Aramayla eşleşen vadesi geçmiş aidat kaydı yok."
                        : "Vadesi geçmiş aidat kaydı yok."}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Son Ödemeler</h2>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz ödeme kaydı yok.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Daire</TableHead>
                <TableHead>Dönem</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Yöntem</TableHead>
                <TableHead className="text-right">Makbuz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {payment.duesRecord.unit.block ? `${payment.duesRecord.unit.block.name} / ` : ""}
                    {payment.duesRecord.unit.unitNumber}
                  </TableCell>
                  <TableCell>{formatPeriod(payment.duesRecord.period)}</TableCell>
                  <TableCell>{formatCurrency(Number(payment.amount))}</TableCell>
                  <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{paymentMethodLabels[payment.paymentMethod]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={
                        <a href={`/api/dues-payments/${payment.id}/receipt`} target="_blank" rel="noreferrer">
                          <FileText className="size-4" />
                          Makbuz
                        </a>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
