import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { deleteUnitAction } from "@/actions/units";
import { deleteSiteAction } from "@/actions/sites";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { SiteSubNav } from "@/components/site-sub-nav";
import { ListSearch } from "@/components/list-search";
import { ListFilter } from "@/components/list-filter";
import { UnitExcelImport } from "@/components/unit-excel-import";
import { SearchX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const unitTypeLabels: Record<string, string> = {
  MESKEN: "Mesken",
  ISYERI: "İşyeri",
  DEPO: "Depo",
  DIGER: "Diğer",
};

const unitTypeOptions = Object.entries(unitTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

export default async function SiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ unit?: string; type?: string; block?: string; floor?: string }>;
}) {
  const { siteId } = await params;
  const { unit: unitQuery, type, block: blockQuery, floor: floorQuery } = await searchParams;
  const user = await requireCompanyUser();
  const site = await assertSiteAccess(user, siteId);

  const [blocks, floors, units] = await Promise.all([
    prisma.block.findMany({ where: { siteId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.unit.findMany({
      where: { siteId, floor: { not: null } },
      select: { floor: true },
      distinct: ["floor"],
      orderBy: { floor: "asc" },
    }),
    prisma.unit.findMany({
      where: {
        siteId,
        ...(unitQuery ? { unitNumber: { contains: unitQuery, mode: "insensitive" } } : {}),
        ...(type ? { type: type as "MESKEN" | "ISYERI" | "DEPO" | "DIGER" } : {}),
        ...(blockQuery ? { blockId: blockQuery } : {}),
        ...(floorQuery ? { floor: floorQuery } : {}),
      },
      orderBy: [{ block: { name: "asc" } }, { unitNumber: "asc" }],
      include: { block: true, _count: { select: { residents: true } } },
    }),
  ]);

  const hasActiveFilter = Boolean(unitQuery || type || blockQuery || floorQuery);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{site.name}</h1>
          <p className="text-sm text-muted-foreground">{site.address || "Adres girilmemiş"}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/sites/${site.id}/edit`}>Düzenle</Link>}
          />
          {user.role === "COMPANY_ADMIN" && (
            <form action={deleteSiteAction.bind(null, site.id)}>
              <ConfirmSubmitButton confirmMessage="Bu siteyi silmek istediğinize emin misiniz? Tüm blok, daire ve sakin kayıtları da silinecek.">
                Siteyi Sil
              </ConfirmSubmitButton>
            </form>
          )}
        </div>
      </div>

      <SiteSubNav siteId={site.id} />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Daireler</h2>
          <Button size="sm" render={<Link href={`/sites/${site.id}/units/new`}>Yeni Daire</Link>} />
        </div>
        <UnitExcelImport siteId={site.id} />
        <div className="flex flex-wrap items-center gap-2">
          <ListSearch paramName="unit" placeholder="Daire no ara…" className="sm:w-48" />
          <ListFilter
            paramName="block"
            label="Tüm Bloklar"
            options={blocks.map((b) => ({ value: b.id, label: b.name }))}
          />
          <ListFilter paramName="type" label="Tüm Tipler" options={unitTypeOptions} />
          <ListFilter
            paramName="floor"
            label="Tüm Katlar"
            options={floors
              .filter((f): f is { floor: string } => f.floor !== null)
              .map((f) => ({ value: f.floor, label: f.floor }))}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Daire No</TableHead>
              <TableHead>Blok</TableHead>
              <TableHead>Kat</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Sakin</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell className="font-medium">{unit.unitNumber}</TableCell>
                <TableCell>{unit.block?.name ?? "—"}</TableCell>
                <TableCell>{unit.floor ?? "—"}</TableCell>
                <TableCell>{unitTypeLabels[unit.type]}</TableCell>
                <TableCell>{unit._count.residents}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/units/${unit.id}`}>Detay</Link>}
                  />
                  <form action={deleteUnitAction.bind(null, site.id, unit.id)} className="inline">
                    <ConfirmSubmitButton confirmMessage="Bu daireyi silmek istediğinize emin misiniz?">
                      Sil
                    </ConfirmSubmitButton>
                  </form>
                </TableCell>
              </TableRow>
            ))}
            {units.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {hasActiveFilter ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SearchX className="size-5" />
                      <span>Aramayla eşleşen daire bulunamadı.</span>
                    </div>
                  ) : (
                    "Henüz daire eklenmedi."
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
