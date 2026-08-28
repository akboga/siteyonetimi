import Link from "next/link";
import { Building2, DoorOpen, Users, Plus, UserPlus, ArrowRight, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DashboardPage() {
  const user = await requireCompanyUser();
  const siteIds = await getAccessibleSiteIds(user);

  const [siteCount, unitCount, residentCount, recentSites] = await Promise.all([
    siteIds.length,
    prisma.unit.count({ where: { siteId: { in: siteIds } } }),
    prisma.resident.count({ where: { unit: { siteId: { in: siteIds } } } }),
    prisma.site.findMany({
      where: { id: { in: siteIds } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { blocks: true, units: true } } },
    }),
  ]);

  const avgUnitsPerSite = siteCount > 0 ? Math.round((unitCount / siteCount) * 10) / 10 : 0;
  const avgResidentsPerUnit = unitCount > 0 ? Math.round((residentCount / unitCount) * 10) / 10 : 0;

  const stats: { label: string; value: number; icon: LucideIcon; hint?: string }[] = [
    { label: "Toplam Site", value: siteCount, icon: Building2 },
    {
      label: "Toplam Daire",
      value: unitCount,
      icon: DoorOpen,
      hint: siteCount > 0 ? `Site başına ort. ${avgUnitsPerSite}` : undefined,
    },
    {
      label: "Kayıtlı Sakin",
      value: residentCount,
      icon: Users,
      hint: unitCount > 0 ? `Daire başına ort. ${avgResidentsPerUnit}` : undefined,
    },
  ];

  const firstName = user.name.split(" ")[0];
  const isAdmin = user.role === "COMPANY_ADMIN";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Merhaba, {firstName}</h1>
          <p className="text-sm text-muted-foreground">Erişebildiğiniz sitelerin güncel özeti</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              render={
                <Link href="/staff/new">
                  <UserPlus className="size-4" />
                  Personel Ekle
                </Link>
              }
            />
            <Button
              render={
                <Link href="/sites/new">
                  <Plus className="size-4" />
                  Yeni Site Ekle
                </Link>
              }
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex-row items-center justify-between pb-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <stat.icon className="size-4.5" />
              </span>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
              {stat.hint && <p className="text-xs text-muted-foreground">{stat.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Son Eklenen Siteler</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            render={
              <Link href="/sites">
                Tümünü Gör
                <ArrowRight className="size-3.5" />
              </Link>
            }
          />
        </CardHeader>
        <CardContent className="px-0">
          {recentSites.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Site Adı</TableHead>
                  <TableHead>Adres</TableHead>
                  <TableHead>Blok</TableHead>
                  <TableHead className="pr-6 text-right">Daire</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSites.map((site) => (
                  <TableRow key={site.id} className="cursor-pointer">
                    <TableCell className="pl-6 font-medium">
                      <Link href={`/sites/${site.id}`} className="hover:underline">
                        {site.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{site.address ?? "—"}</TableCell>
                    <TableCell>{site._count.blocks}</TableCell>
                    <TableCell className="pr-6 text-right">{site._count.units}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center text-muted-foreground">
              <Building2 className="size-6" />
              <p className="text-sm">Henüz erişebildiğiniz bir site yok.</p>
              {isAdmin && (
                <Button
                  size="sm"
                  className="mt-1"
                  render={
                    <Link href="/sites/new">
                      <Plus className="size-4" />
                      İlk Siteni Ekle
                    </Link>
                  }
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
