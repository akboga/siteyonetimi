import { ArrowUpCircle, FileText } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { updateCompanySettingsAction, requestPackageUpgradeAction } from "@/actions/companies";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { CompanySettingsForm } from "@/components/company-settings-form";
import { ProfileForm } from "@/components/profile-form";
import { ChangePasswordForm } from "@/components/change-password-form";
import { CompanyLogoUpload } from "@/components/company-logo-upload";
import { FormDialog } from "@/components/form-dialog";

const INVOICE_STATUS_LABELS: Record<string, string> = {
  BEKLIYOR: "Bekliyor",
  ODENDI: "Ödendi",
  GECIKTI: "Gecikti",
};
const INVOICE_STATUS_VARIANT: Record<string, "secondary" | "outline" | "destructive"> = {
  BEKLIYOR: "outline",
  ODENDI: "secondary",
  GECIKTI: "destructive",
};

export default async function SettingsPage() {
  const admin = await requireRole("COMPANY_ADMIN");

  const [company, user, packages, invoices] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: admin.companyId! },
      include: { package: true, requestedPackage: true },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: admin.id }, select: { name: true, email: true } }),
    prisma.subscriptionPackage.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.invoice.findMany({ where: { companyId: admin.companyId! }, orderBy: { period: "desc" } }),
  ]);

  const otherPackages = packages.filter((p) => p.id !== company.packageId);
  const hasPendingRequest = Boolean(company.requestedPackageId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Şirket Ayarları</h1>
        <p className="text-sm text-muted-foreground">Hesap, abonelik ve şirket bilgileri</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Hesap Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <ProfileForm defaultValues={{ name: user.name, email: user.email }} />
                <div className="space-y-4 sm:border-l sm:pl-8">
                  <p className="text-sm font-medium">Şifre Değiştir</p>
                  <ChangePasswordForm />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Şirket Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <CompanySettingsForm
                action={updateCompanySettingsAction}
                defaultValues={{
                  name: company.name,
                  taxNumber: company.taxNumber ?? "",
                  contactEmail: company.contactEmail ?? "",
                  contactPhone: company.contactPhone ?? "",
                  billingAddress: company.billingAddress ?? "",
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Abonelik</CardTitle>
              <Badge variant={company.subscriptionStatus === "ACTIVE" ? "default" : "secondary"}>
                {company.subscriptionStatus === "ACTIVE" ? "Aktif" : "Pasif"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Paket</p>
                  <p className="text-lg font-semibold">{company.package?.name ?? "Atanmadı"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Daire Limiti</p>
                  <p className="text-lg font-semibold">
                    {company.package?.isCustom ? (company.customUnitLimit ?? "—") : (company.package?.unitLimit ?? "—")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Aylık Ücret</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(Number(company.package?.isCustom ? company.customMonthlyPrice : company.package?.monthlyPrice) || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hizmet Başlangıcı</p>
                  <p className="text-lg font-semibold">{formatDate(company.createdAt)}</p>
                </div>
              </div>

              {hasPendingRequest ? (
                <div className="rounded-lg bg-muted/60 p-3 text-sm">
                  <span className="font-medium">{company.requestedPackage?.name}</span> paketine geçiş talebiniz onay
                  bekliyor.
                </div>
              ) : (
                otherPackages.length > 0 && (
                  <FormDialog
                    triggerLabel={
                      <>
                        <ArrowUpCircle className="size-4" />
                        Paketimi Yükselt
                      </>
                    }
                    triggerVariant="outline"
                    title="Paket Yükseltme Talebi"
                    description="Talebiniz superadmin onayından sonra etkinleşir."
                    action={requestPackageUpgradeAction}
                    submitLabel="Talebi Gönder"
                  >
                    <Select name="packageId" items={Object.fromEntries(otherPackages.map((p) => [p.id, p.name]))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Paket seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherPackages.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            {!p.isCustom && p.unitLimit ? ` — ${p.unitLimit} daireye kadar` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormDialog>
                )
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Şirket Logosu</CardTitle>
            </CardHeader>
            <CardContent>
              <CompanyLogoUpload initialLogoUrl={company.logoUrl} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faturalarım</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {invoices.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground">Henüz abonelik faturanız yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Dönem</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="pr-6 text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="pl-6 font-medium">{formatPeriod(invoice.period)}</TableCell>
                    <TableCell>{formatCurrency(Number(invoice.amount))}</TableCell>
                    <TableCell>
                      <Badge variant={INVOICE_STATUS_VARIANT[invoice.status]}>
                        {INVOICE_STATUS_LABELS[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        render={
                          <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                            <FileText className="size-4" />
                            PDF İndir
                          </a>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
