import { Plus, Package, SearchX } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { createVendorAction, deleteVendorAction, updateVendorSitesAction } from "@/actions/vendors";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { VendorSitesDialog } from "@/components/vendor-sites-dialog";
import { ListSearch } from "@/components/list-search";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await requireCompanyUser();
  const isAdmin = user.role === "COMPANY_ADMIN";
  const siteIds = await getAccessibleSiteIds(user);

  const [vendors, sites] = await Promise.all([
    prisma.vendor.findMany({
      where: {
        companyId: user.companyId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { serviceType: { contains: q, mode: "insensitive" } },
                { contactInfo: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { sites: true },
    }),
    prisma.site.findMany({
      where: { id: { in: siteIds } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tedarikçiler</h1>
          <p className="text-sm text-muted-foreground">Şirketinize kayıtlı hizmet firmaları</p>
        </div>
        {isAdmin && (
          <FormDialog
            triggerLabel={
              <>
                <Plus className="size-4" />
                Yeni Tedarikçi
              </>
            }
            title="Yeni Tedarikçi"
            action={createVendorAction}
            submitLabel="Tedarikçiyi Ekle"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Firma Adı</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceType">Hizmet Türü</Label>
              <Input id="serviceType" name="serviceType" placeholder="Asansör Bakım, Temizlik, Güvenlik…" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactInfo">İletişim Bilgisi</Label>
              <Input id="contactInfo" name="contactInfo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="contractStart">Sözleşme Başlangıç</Label>
                <Input id="contractStart" name="contractStart" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractEnd">Sözleşme Bitiş</Label>
                <Input id="contractEnd" name="contractEnd" type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractFileUrl">Sözleşme Dosyası</Label>
              <Input id="contractFileUrl" name="contractFileUrl" type="url" placeholder="https://…" />
            </div>
            {sites.length > 0 && (
              <div className="space-y-2">
                <Label>Siteler</Label>
                <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border p-2.5">
                  {sites.map((site) => (
                    <label key={site.id} className="flex items-center gap-2 text-sm">
                      <Checkbox name="siteIds" value={site.id} />
                      {site.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </FormDialog>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <ListSearch placeholder="Firma veya hizmet türü ara…" />
        <p className="hidden shrink-0 text-sm text-muted-foreground sm:block">
          {vendors.length} tedarikçi
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Firma</TableHead>
            <TableHead>Hizmet Türü</TableHead>
            <TableHead>Sözleşme</TableHead>
            <TableHead>Siteler</TableHead>
            {isAdmin && <TableHead className="text-right">İşlem</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((vendor) => (
            <TableRow key={vendor.id}>
              <TableCell>
                <p className="font-medium">{vendor.name}</p>
                {vendor.contactInfo && <p className="text-xs text-muted-foreground">{vendor.contactInfo}</p>}
              </TableCell>
              <TableCell>{vendor.serviceType}</TableCell>
              <TableCell className="text-muted-foreground">
                {vendor.contractStart || vendor.contractEnd
                  ? `${formatDate(vendor.contractStart)} – ${formatDate(vendor.contractEnd)}`
                  : "—"}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {vendor.sites.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    vendor.sites.map((site) => (
                      <Badge key={site.id} variant="secondary">
                        {site.name}
                      </Badge>
                    ))
                  )}
                </div>
              </TableCell>
              {isAdmin && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <VendorSitesDialog
                      vendorName={vendor.name}
                      sites={sites}
                      assignedSiteIds={new Set(vendor.sites.map((s) => s.id))}
                      action={updateVendorSitesAction.bind(null, vendor.id)}
                    />
                    <form action={deleteVendorAction.bind(null, vendor.id)}>
                      <ConfirmSubmitButton confirmMessage="Bu tedarikçiyi silmek istediğinize emin misiniz?">
                        Sil
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
          {vendors.length === 0 && (
            <TableRow>
              <TableCell colSpan={isAdmin ? 5 : 4} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  {q ? (
                    <>
                      <SearchX className="size-6" />
                      <span>&ldquo;{q}&rdquo; ile eşleşen tedarikçi bulunamadı.</span>
                    </>
                  ) : (
                    <>
                      <Package className="size-6" />
                      <span>Henüz tedarikçi eklenmedi.</span>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
