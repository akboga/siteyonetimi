import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { createResidentAction, deleteResidentAction, markResidentMovedOutAction } from "@/actions/residents";
import { updateUnitAction } from "@/actions/units";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ResidentForm } from "@/components/resident-form";
import { UnitEditFields } from "@/components/unit-edit-fields";
import { FormDialog } from "@/components/form-dialog";
import { notFound } from "next/navigation";

const unitTypeLabels: Record<string, string> = {
  MESKEN: "Mesken",
  ISYERI: "İşyeri",
  DEPO: "Depo",
  DIGER: "Diğer",
};

const relationLabels: Record<string, string> = {
  MALIK: "Malik",
  KIRACI: "Kiracı",
};

const roomLayoutLabels: Record<string, string> = {
  BIR_ARTI_BIR: "1+1",
  IKI_ARTI_BIR: "2+1",
  UC_ARTI_BIR: "3+1",
  DIGER: "Diğer",
};

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const user = await requireCompanyUser();

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: {
      site: true,
      block: true,
      residents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!unit) notFound();
  await assertSiteAccess(user, unit.siteId);

  const activeResidents = unit.residents.filter((r) => r.isActive);
  const pastResidents = unit.residents.filter((r) => !r.isActive);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/sites/${unit.siteId}`} className="text-sm text-muted-foreground hover:underline">
            ← {unit.site.name}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            {unit.block ? `${unit.block.name} / ` : ""}
            {unit.unitNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            {unitTypeLabels[unit.type]}
            {unit.type === "MESKEN" && unit.roomLayout ? ` · ${roomLayoutLabels[unit.roomLayout]}` : ""}
            {unit.floor ? ` · Kat ${unit.floor}` : ""}
            {unit.areaM2 ? ` · ${unit.areaM2} m²` : ""}
          </p>
        </div>
        <FormDialog
          triggerLabel="Daireyi Düzenle"
          triggerVariant="outline"
          triggerSize="sm"
          title="Daireyi Düzenle"
          action={updateUnitAction.bind(null, unitId)}
          submitLabel="Kaydet"
        >
          <UnitEditFields
            defaultValues={{
              unitNumber: unit.unitNumber,
              floor: unit.floor ?? "",
              type: unit.type,
              roomLayout: unit.roomLayout,
              areaM2: unit.areaM2?.toString() ?? "",
            }}
          />
        </FormDialog>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Aktif Sakinler</h2>
        {activeResidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Bu dairede kayıtlı aktif sakin yok.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeResidents.map((resident) => (
              <Card key={resident.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{resident.fullName}</span>
                    <Badge variant="outline">{relationLabels[resident.relationType]}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  {resident.phone && <p>{resident.phone}</p>}
                  {resident.email && <p>{resident.email}</p>}
                  {resident.moveInDate && (
                    <p>Taşınma: {resident.moveInDate.toLocaleDateString("tr-TR")}</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <form action={markResidentMovedOutAction.bind(null, unitId, resident.id)}>
                      <ConfirmSubmitButton variant="outline" confirmMessage="Bu sakini ayrıldı olarak işaretlemek istediğinize emin misiniz?">
                        Ayrıldı
                      </ConfirmSubmitButton>
                    </form>
                    <form action={deleteResidentAction.bind(null, unitId, resident.id)}>
                      <ConfirmSubmitButton confirmMessage="Bu sakin kaydını tamamen silmek istediğinize emin misiniz?">
                        Sil
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="max-w-2xl space-y-4">
        <h2 className="text-lg font-medium">Yeni Sakin Ekle</h2>
        <ResidentForm action={createResidentAction.bind(null, unitId)} />
      </section>

      {pastResidents.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Geçmiş Sakinler</h2>
          <div className="space-y-2">
            {pastResidents.map((resident) => (
              <div key={resident.id} className="flex items-center justify-between rounded-md border px-4 py-2 text-sm">
                <span>
                  {resident.fullName} · {relationLabels[resident.relationType]}
                </span>
                <span className="text-muted-foreground">
                  {resident.moveInDate?.toLocaleDateString("tr-TR") ?? "?"} –{" "}
                  {resident.moveOutDate?.toLocaleDateString("tr-TR") ?? "?"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
