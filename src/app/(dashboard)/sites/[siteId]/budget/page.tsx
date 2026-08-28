import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, PiggyBank } from "lucide-react";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { getBudgetVsActual } from "@/lib/reports";
import { formatCurrency } from "@/lib/format";
import { setBudgetItemAction, deleteBudgetItemAction } from "@/actions/budget";
import { SiteSubNav } from "@/components/site-sub-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SiteBudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { siteId } = await params;
  const { year: yearParam } = await searchParams;
  const user = await requireCompanyUser();
  const site = await assertSiteAccess(user, siteId);

  const year = yearParam ? Number(yearParam) : new Date().getFullYear();
  const { rows, totals } = await getBudgetVsActual(siteId, year);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Bütçe Planlama</h1>
          <p className="text-sm text-muted-foreground">{site.name}</p>
        </div>
        <FormDialog
          triggerLabel={
            <>
              <Plus className="size-4" />
              Bütçe Kalemi
            </>
          }
          title="Bütçe Kalemi Ekle / Güncelle"
          description="Aynı yıl ve kategori için tekrar kaydedilirse tutar güncellenir."
          action={setBudgetItemAction.bind(null, siteId)}
          submitLabel="Kaydet"
        >
          <div className="space-y-2">
            <Label htmlFor="year">Yıl</Label>
            <Input id="year" name="year" type="number" defaultValue={year} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Kategori</Label>
            <Input id="category" name="category" placeholder="Temizlik, Güvenlik, Elektrik…" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plannedAmount">Planlanan Tutar (₺)</Label>
            <Input id="plannedAmount" name="plannedAmount" type="number" step="0.01" min="0" required />
          </div>
        </FormDialog>
      </div>

      <SiteSubNav siteId={siteId} />

      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          render={<Link href={`/sites/${siteId}/budget?year=${year - 1}`} aria-label="Önceki yıl" />}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-lg font-semibold tabular-nums">{year}</span>
        <Button
          variant="outline"
          size="icon-sm"
          render={<Link href={`/sites/${siteId}/budget?year=${year + 1}`} aria-label="Sonraki yıl" />}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">Planlanan</p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(totals.planned)}</p>
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">Gerçekleşen</p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(totals.actual)}</p>
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">Fark</p>
          <p className={cn("mt-1 text-2xl font-semibold", totals.variance > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
            {formatCurrency(totals.variance)}
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kategori</TableHead>
            <TableHead>Planlanan</TableHead>
            <TableHead>Gerçekleşen</TableHead>
            <TableHead>Fark</TableHead>
            <TableHead>Kalan</TableHead>
            <TableHead className="text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.category}>
              <TableCell className="font-medium">{row.category}</TableCell>
              <TableCell>{formatCurrency(row.planned)}</TableCell>
              <TableCell>{formatCurrency(row.actual)}</TableCell>
              <TableCell className={row.variance > 0 ? "text-destructive" : ""}>
                {formatCurrency(row.variance)}
              </TableCell>
              <TableCell>{formatCurrency(row.remaining)}</TableCell>
              <TableCell className="text-right">
                {row.budgetItemId && (
                  <form action={deleteBudgetItemAction.bind(null, siteId, row.budgetItemId)}>
                    <ConfirmSubmitButton confirmMessage="Bu bütçe kalemini silmek istediğinize emin misiniz?">
                      Sil
                    </ConfirmSubmitButton>
                  </form>
                )}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <PiggyBank className="size-6" />
                  <span>{year} yılı için bütçe veya gider kaydı yok.</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
