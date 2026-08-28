import { Plus, Receipt } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/format";
import { generateMonthlyInvoicesAction, toggleInvoicePaidAction } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/form-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusLabels: Record<string, string> = {
  BEKLIYOR: "Bekliyor",
  ODENDI: "Ödendi",
  GECIKTI: "Gecikti",
};

const statusVariant: Record<string, "secondary" | "default" | "destructive"> = {
  BEKLIYOR: "secondary",
  ODENDI: "default",
  GECIKTI: "destructive",
};

export default async function InvoicesPage() {
  await requireRole("SUPER_ADMIN");

  const invoices = await prisma.invoice.findMany({
    orderBy: { period: "desc" },
    include: { company: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Abonelik Faturaları</h1>
          <p className="text-sm text-muted-foreground">
            Şirket bazlı Apsis abonelik faturaları ve ödeme durumları
          </p>
        </div>
        <FormDialog
          triggerLabel={
            <>
              <Plus className="size-4" />
              Dönem Faturası Oluştur
            </>
          }
          title="Aylık Fatura Oluştur"
          description="Seçilen dönem için, faturası olmayan tüm aktif şirketlere daire sayısına göre fatura oluşturulur."
          action={generateMonthlyInvoicesAction}
          submitLabel="Faturaları Oluştur"
        >
          <div className="space-y-2">
            <Label htmlFor="period">Dönem</Label>
            <Input id="period" name="period" type="month" required />
          </div>
        </FormDialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Şirket</TableHead>
            <TableHead>Dönem</TableHead>
            <TableHead>Daire Sayısı</TableHead>
            <TableHead>Tutar</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Ödeme Tarihi</TableHead>
            <TableHead className="text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.company.name}</TableCell>
              <TableCell>{formatPeriod(invoice.period)}</TableCell>
              <TableCell>{invoice.unitCount}</TableCell>
              <TableCell>{formatCurrency(Number(invoice.amount))}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[invoice.status]}>{statusLabels[invoice.status]}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(invoice.paidAt)}</TableCell>
              <TableCell className="text-right">
                <form action={toggleInvoicePaidAction.bind(null, invoice.id)}>
                  <Button variant="outline" size="sm" type="submit">
                    {invoice.status === "ODENDI" ? "Ödenmedi İşaretle" : "Ödendi İşaretle"}
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {invoices.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Receipt className="size-6" />
                  <span>Henüz fatura oluşturulmadı.</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
