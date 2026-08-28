import { Plus, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { getExpenseBreakdownByCategory } from "@/lib/reports";
import { formatCurrency, formatDate } from "@/lib/format";
import { createExpenseAction, deleteExpenseAction } from "@/actions/expenses";
import { SiteSubNav } from "@/components/site-sub-nav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ListSearch } from "@/components/list-search";
import { ListFilter } from "@/components/list-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SiteExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { siteId } = await params;
  const { q, category } = await searchParams;
  const user = await requireCompanyUser();
  const site = await assertSiteAccess(user, siteId);

  const currentYear = new Date().getFullYear();
  const [expenses, breakdown] = await Promise.all([
    prisma.expense.findMany({
      where: {
        siteId,
        ...(category ? { category } : {}),
        ...(q
          ? {
              OR: [
                { category: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { date: "desc" },
      take: 100,
    }),
    getExpenseBreakdownByCategory(siteId, currentYear),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Giderler</h1>
          <p className="text-sm text-muted-foreground">{site.name}</p>
        </div>
        <FormDialog
          triggerLabel={
            <>
              <Plus className="size-4" />
              Yeni Gider
            </>
          }
          title="Yeni Gider Kaydı"
          action={createExpenseAction.bind(null, siteId)}
          submitLabel="Gideri Kaydet"
        >
          <div className="space-y-2">
            <Label htmlFor="category">Kategori</Label>
            <Input id="category" name="category" placeholder="Temizlik, Güvenlik, Elektrik…" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Tutar (₺)</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Tarih</Label>
            <Input id="date" name="date" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="attachmentUrl">Fatura/Belge Bağlantısı</Label>
            <Input id="attachmentUrl" name="attachmentUrl" type="url" placeholder="https://…" />
          </div>
        </FormDialog>
      </div>

      <SiteSubNav siteId={siteId} />

      {breakdown.length > 0 && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {breakdown.map((item) => (
            <div key={item.category} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <p className="truncate text-sm text-muted-foreground">{item.category}</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(item.total)}</p>
            </div>
          ))}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <ListSearch placeholder="Kategori veya açıklama ara…" />
        {breakdown.length > 0 && (
          <ListFilter
            paramName="category"
            label="Tüm Kategoriler"
            options={breakdown.map((item) => ({ value: item.category, label: item.category }))}
          />
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kategori</TableHead>
            <TableHead>Tutar</TableHead>
            <TableHead>Tarih</TableHead>
            <TableHead>Açıklama</TableHead>
            <TableHead className="text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell className="font-medium">{expense.category}</TableCell>
              <TableCell>{formatCurrency(Number(expense.amount))}</TableCell>
              <TableCell>{formatDate(expense.date)}</TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">
                {expense.description ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <form action={deleteExpenseAction.bind(null, siteId, expense.id)}>
                  <ConfirmSubmitButton confirmMessage="Bu gider kaydını silmek istediğinize emin misiniz?">
                    Sil
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {expenses.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Wallet className="size-6" />
                  <span>
                    {q || category ? "Aramayla eşleşen gider kaydı yok." : "Henüz gider kaydı yok."}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
