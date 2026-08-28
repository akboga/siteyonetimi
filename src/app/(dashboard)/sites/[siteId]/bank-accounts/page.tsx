import { Plus, Landmark, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { getBankAccountBalances } from "@/lib/reports";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  createBankAccountAction,
  deleteBankAccountAction,
  createBankTransactionAction,
  deleteBankTransactionAction,
} from "@/actions/bank-accounts";
import { SiteSubNav } from "@/components/site-sub-nav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const typeLabels: Record<string, string> = { KASA: "Kasa", BANKA: "Banka" };

export default async function SiteBankAccountsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const user = await requireCompanyUser();
  const site = await assertSiteAccess(user, siteId);

  const [accountsWithTx, { accounts: balances, totalBalance }] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { siteId },
      include: { transactions: { orderBy: { date: "desc" }, take: 8 } },
      orderBy: { createdAt: "asc" },
    }),
    getBankAccountBalances(siteId),
  ]);

  const balanceById = new Map(balances.map((b) => [b.id, b]));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Kasa / Banka Hesapları</h1>
          <p className="text-sm text-muted-foreground">{site.name}</p>
        </div>
        <FormDialog
          triggerLabel={
            <>
              <Plus className="size-4" />
              Yeni Hesap
            </>
          }
          title="Yeni Kasa/Banka Hesabı"
          action={createBankAccountAction.bind(null, siteId)}
          submitLabel="Hesabı Oluştur"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Hesap Adı</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tür</Label>
            <Select name="type" defaultValue="KASA" items={typeLabels}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KASA">Kasa</SelectItem>
                <SelectItem value="BANKA">Banka</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankName">Banka Adı (banka ise)</Label>
            <Input id="bankName" name="bankName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN (banka ise)</Label>
            <Input id="iban" name="iban" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="openingBalance">Açılış Bakiyesi (₺)</Label>
            <Input id="openingBalance" name="openingBalance" type="number" step="0.01" />
          </div>
        </FormDialog>
      </div>

      <SiteSubNav siteId={siteId} />

      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-sm text-muted-foreground">Toplam Bakiye</p>
        <p className="mt-1 text-2xl font-semibold">{formatCurrency(totalBalance)}</p>
      </div>

      {accountsWithTx.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
          <Landmark className="size-6" />
          <span>Henüz kasa/banka hesabı yok.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {accountsWithTx.map((account) => {
            const balance = balanceById.get(account.id);
            return (
              <Card key={account.id}>
                <CardHeader className="flex-row items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {account.name}
                      <Badge variant="outline">{typeLabels[account.type]}</Badge>
                    </CardTitle>
                    {account.bankName && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {account.bankName} {account.iban ? `· ${account.iban}` : ""}
                      </p>
                    )}
                  </div>
                  <p className="text-lg font-semibold">{formatCurrency(balance?.currentBalance ?? 0)}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <FormDialog
                      triggerLabel={
                        <>
                          <Plus className="size-4" />
                          İşlem Ekle
                        </>
                      }
                      triggerVariant="outline"
                      title={`${account.name} — Yeni İşlem`}
                      action={createBankTransactionAction.bind(null, account.id)}
                      submitLabel="İşlemi Kaydet"
                    >
                      <div className="space-y-2">
                        <Label htmlFor={`tx-date-${account.id}`}>Tarih</Label>
                        <Input id={`tx-date-${account.id}`} name="date" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`tx-amount-${account.id}`}>Tutar (₺)</Label>
                        <Input id={`tx-amount-${account.id}`} name="amount" type="number" step="0.01" min="0" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`tx-direction-${account.id}`}>Yön</Label>
                        <Select name="direction" defaultValue="GIRIS" items={{ GIRIS: "Giriş", CIKIS: "Çıkış" }}>
                          <SelectTrigger id={`tx-direction-${account.id}`} className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GIRIS">Giriş</SelectItem>
                            <SelectItem value="CIKIS">Çıkış</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`tx-desc-${account.id}`}>Açıklama</Label>
                        <Input id={`tx-desc-${account.id}`} name="description" />
                      </div>
                    </FormDialog>
                    <form action={deleteBankAccountAction.bind(null, siteId, account.id)}>
                      <ConfirmSubmitButton confirmMessage="Bu hesabı ve tüm işlemlerini silmek istediğinize emin misiniz?">
                        Hesabı Sil
                      </ConfirmSubmitButton>
                    </form>
                  </div>

                  {account.transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Henüz işlem yok.</p>
                  ) : (
                    <div className="space-y-1">
                      {account.transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            {tx.direction === "GIRIS" ? (
                              <ArrowDownCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <ArrowUpCircle className="size-4 text-destructive" />
                            )}
                            <div>
                              <p>{tx.description || (tx.direction === "GIRIS" ? "Giriş" : "Çıkış")}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={tx.direction === "GIRIS" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                              {tx.direction === "GIRIS" ? "+" : "-"}
                              {formatCurrency(Number(tx.amount))}
                            </span>
                            <form action={deleteBankTransactionAction.bind(null, account.id, tx.id)}>
                              <button type="submit" className="text-muted-foreground hover:text-destructive">
                                ×
                              </button>
                            </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
