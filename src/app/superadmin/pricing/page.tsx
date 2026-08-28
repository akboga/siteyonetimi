import { Plus, PackageCheck } from "lucide-react";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  createPackageAction,
  updatePackageAction,
} from "@/actions/packages";
import {
  approvePackageUpgradeAction,
  rejectPackageUpgradeAction,
} from "@/actions/companies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDialog } from "@/components/form-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function PackageFormFields({
  defaultValues,
}: {
  defaultValues?: { name: string; isCustom: boolean; unitLimit: number | null; monthlyPrice: number | null; sortOrder: number };
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Paket Adı</Label>
        <Input id="name" name="name" required defaultValue={defaultValues?.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="unitLimit">Daire Limiti</Label>
        <Input id="unitLimit" name="unitLimit" type="number" min="1" defaultValue={defaultValues?.unitLimit ?? undefined} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="monthlyPrice">Aylık Ücret (₺)</Label>
        <Input id="monthlyPrice" name="monthlyPrice" type="number" step="0.01" min="0" defaultValue={defaultValues?.monthlyPrice ?? undefined} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sortOrder">Sıralama</Label>
        <Input id="sortOrder" name="sortOrder" type="number" defaultValue={defaultValues?.sortOrder ?? 0} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="isCustom" defaultChecked={defaultValues?.isCustom} />
        Özel paket (daire limiti/ücret her şirket için ayrı belirlenir, yukarıdaki alanlar boş bırakılabilir)
      </label>
    </>
  );
}

export default async function PricingPage() {
  await requireRole("SUPER_ADMIN");

  const [packages, pendingRequests] = await Promise.all([
    prisma.subscriptionPackage.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.company.findMany({
      where: { requestedPackageId: { not: null } },
      include: { package: true, requestedPackage: true },
      orderBy: { requestedAt: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Fiyatlandırma</h1>
        <p className="text-sm text-muted-foreground">Abonelik paketleri ve bekleyen yükseltme talepleri</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Bekleyen Yükseltme Talepleri</h2>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Bekleyen bir yükseltme talebi yok.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Şirket</TableHead>
                <TableHead>Mevcut Paket</TableHead>
                <TableHead>Talep Edilen Paket</TableHead>
                <TableHead>Talep Tarihi</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell className="text-muted-foreground">{company.package?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{company.requestedPackage?.name}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(company.requestedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <FormDialog
                        triggerLabel="Onayla"
                        triggerVariant="outline"
                        title={`${company.name} — Paket Yükseltmeyi Onayla`}
                        description={
                          company.requestedPackage?.isCustom
                            ? "Özel paket için daire limiti ve aylık ücreti belirleyin."
                            : `${company.requestedPackage?.name} paketine geçirilecek.`
                        }
                        action={approvePackageUpgradeAction.bind(null, company.id)}
                        submitLabel="Onayla"
                      >
                        {company.requestedPackage?.isCustom && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor={`custom-limit-${company.id}`}>Daire Limiti</Label>
                              <Input id={`custom-limit-${company.id}`} name="customUnitLimit" type="number" min="1" required />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`custom-price-${company.id}`}>Aylık Ücret (₺)</Label>
                              <Input id={`custom-price-${company.id}`} name="customMonthlyPrice" type="number" step="0.01" min="0" required />
                            </div>
                          </>
                        )}
                      </FormDialog>
                      <form action={rejectPackageUpgradeAction.bind(null, company.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          Reddet
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Paket Kataloğu</h2>
          <FormDialog
            triggerLabel={
              <>
                <Plus className="size-4" />
                Yeni Paket
              </>
            }
            title="Yeni Abonelik Paketi"
            action={createPackageAction}
            submitLabel="Paketi Oluştur"
          >
            <PackageFormFields />
          </FormDialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paket</TableHead>
              <TableHead>Daire Limiti</TableHead>
              <TableHead>Aylık Ücret</TableHead>
              <TableHead>Tür</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.map((pkg) => (
              <TableRow key={pkg.id}>
                <TableCell className="font-medium">{pkg.name}</TableCell>
                <TableCell>{pkg.unitLimit ?? "Şirkete özel"}</TableCell>
                <TableCell>{pkg.monthlyPrice ? formatCurrency(Number(pkg.monthlyPrice)) : "Şirkete özel"}</TableCell>
                <TableCell>
                  {pkg.isCustom ? <Badge variant="outline">Özel</Badge> : <Badge variant="secondary">Standart</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <FormDialog
                    triggerLabel="Düzenle"
                    triggerVariant="outline"
                    title={`${pkg.name} — Paketi Düzenle`}
                    action={updatePackageAction.bind(null, pkg.id)}
                    submitLabel="Kaydet"
                  >
                    <PackageFormFields
                      defaultValues={{
                        name: pkg.name,
                        isCustom: pkg.isCustom,
                        unitLimit: pkg.unitLimit,
                        monthlyPrice: pkg.monthlyPrice ? Number(pkg.monthlyPrice) : null,
                        sortOrder: pkg.sortOrder,
                      }}
                    />
                  </FormDialog>
                </TableCell>
              </TableRow>
            ))}
            {packages.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <PackageCheck className="size-6" />
                    <span>Henüz paket tanımlanmadı.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
