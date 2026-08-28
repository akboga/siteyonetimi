import Link from "next/link";
import { Plus, Building2, SearchX } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { ListSearch } from "@/components/list-search";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await requireCompanyUser();
  const siteIds = await getAccessibleSiteIds(user);

  const sites = await prisma.site.findMany({
    where: {
      id: { in: siteIds },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { blocks: true, units: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Siteler</h1>
          <p className="text-sm text-muted-foreground">Erişebildiğiniz siteler</p>
        </div>
        {user.role === "COMPANY_ADMIN" && (
          <Button
            render={
              <Link href="/sites/new">
                <Plus className="size-4" />
                Yeni Site Ekle
              </Link>
            }
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <ListSearch placeholder="Site adı veya adres ara…" />
        <p className="hidden shrink-0 text-sm text-muted-foreground sm:block">
          {sites.length} site
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Site Adı</TableHead>
            <TableHead>Adres</TableHead>
            <TableHead>Blok</TableHead>
            <TableHead>Daire</TableHead>
            <TableHead className="text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.map((site) => (
            <TableRow key={site.id}>
              <TableCell className="font-medium">{site.name}</TableCell>
              <TableCell className="text-muted-foreground">{site.address ?? "—"}</TableCell>
              <TableCell>{site._count.blocks}</TableCell>
              <TableCell>{site._count.units}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/sites/${site.id}`}>Detay</Link>}
                />
              </TableCell>
            </TableRow>
          ))}
          {sites.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  {q ? (
                    <>
                      <SearchX className="size-6" />
                      <span>&ldquo;{q}&rdquo; ile eşleşen site bulunamadı.</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="size-6" />
                      <span>Henüz erişebildiğiniz bir site yok.</span>
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
