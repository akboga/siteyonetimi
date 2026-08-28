import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { updateSiteAction } from "@/actions/sites";
import { setSiteDuesRateAction, deleteSiteDuesRateAction } from "@/actions/site-dues-rates";
import { formatCurrency, formatDate } from "@/lib/format";
import { SiteForm } from "@/components/site-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const user = await requireCompanyUser();
  const site = await assertSiteAccess(user, siteId);

  const rates = await prisma.siteDuesRate.findMany({
    where: { siteId },
    orderBy: { validFrom: "desc" },
  });
  const now = new Date();
  const isCurrentRate = (rate: (typeof rates)[number]) =>
    rate.validFrom <= now && (rate.validTo === null || rate.validTo > now);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Site Düzenle</h1>
        <p className="text-sm text-muted-foreground">{site.name}</p>
      </div>
      <SiteForm
        action={updateSiteAction.bind(null, siteId)}
        defaultValues={{
          name: site.name,
          address: site.address ?? "",
          managementPlanNo: site.managementPlanNo ?? "",
          lateFeeRatePercent: site.lateFeeRatePercent?.toString() ?? "",
        }}
        submitLabel="Değişiklikleri Kaydet"
      />

      <Card className="max-w-lg">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Aidat Tarifesi</CardTitle>
          <FormDialog
            triggerLabel={
              <>
                <Plus className="size-4" />
                Yeni Tarife
              </>
            }
            triggerVariant="outline"
            triggerSize="sm"
            title="Yeni Aidat Tarifesi"
            description="Belirtilen tarihten itibaren geçerli olur; önceki açık tarife otomatik olarak bu tarihte kapanır."
            action={setSiteDuesRateAction.bind(null, siteId)}
            submitLabel="Tarifeyi Ekle"
          >
            <div className="space-y-2">
              <Label htmlFor="amount">Aylık Aidat Tutarı (₺)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validFrom">Geçerlilik Başlangıcı</Label>
              <Input id="validFrom" name="validFrom" type="date" required />
            </div>
          </FormDialog>
        </CardHeader>
        <CardContent className="px-0">
          {rates.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground">
              Henüz aidat tarifesi tanımlanmadı. Otomatik aylık tahakkuk için bir tarife eklemelisiniz.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Tutar</TableHead>
                  <TableHead>Başlangıç</TableHead>
                  <TableHead>Bitiş</TableHead>
                  <TableHead className="pr-6 text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="pl-6 font-medium">
                      {formatCurrency(Number(rate.amount))}
                      {isCurrentRate(rate) && (
                        <Badge variant="default" className="ml-2">
                          Güncel
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(rate.validFrom)}</TableCell>
                    <TableCell>{rate.validTo ? formatDate(rate.validTo) : "—"}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <form action={deleteSiteDuesRateAction.bind(null, siteId, rate.id)}>
                        <ConfirmSubmitButton confirmMessage="Bu tarifeyi silmek istediğinize emin misiniz?">
                          Sil
                        </ConfirmSubmitButton>
                      </form>
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
