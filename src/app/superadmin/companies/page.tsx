import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toggleCompanyStatusAction } from "@/actions/companies";
import { formatCurrency } from "@/lib/format";

export default async function CompaniesPage() {
  await requireRole("SUPER_ADMIN");

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sites: true, users: true } }, package: true },
  });

  const unitCounts = await prisma.unit.groupBy({
    by: ["siteId"],
    _count: true,
  });
  const siteToCompany = await prisma.site.findMany({ select: { id: true, companyId: true } });
  const companyUnitCount = new Map<string, number>();
  for (const site of siteToCompany) {
    const count = unitCounts.find((u) => u.siteId === site.id)?._count ?? 0;
    companyUnitCount.set(site.companyId, (companyUnitCount.get(site.companyId) ?? 0) + count);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Yönetim Şirketleri</h1>
          <p className="text-sm text-muted-foreground">
            Apsis&apos;e kayıtlı tüm yönetim şirketleri ve otomatik hesaplanan aylık fatura tutarları
          </p>
        </div>
        <Button render={<Link href="/superadmin/companies/new">Yeni Şirket Ekle</Link>} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Şirket</TableHead>
            <TableHead>Kullanıcı</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Daire</TableHead>
            <TableHead>Paket</TableHead>
            <TableHead>Aylık Tutar</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead className="text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => {
            const unitCount = companyUnitCount.get(company.id) ?? 0;
            return (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company._count.users}</TableCell>
                <TableCell>{company._count.sites}</TableCell>
                <TableCell>{unitCount}</TableCell>
                <TableCell>{company.package?.name ?? "—"}</TableCell>
                <TableCell>
                  {formatCurrency(Number(company.package?.monthlyPrice ?? company.customMonthlyPrice ?? 0))}
                </TableCell>
                <TableCell>
                  <Badge variant={company.subscriptionStatus === "ACTIVE" ? "default" : "secondary"}>
                    {company.subscriptionStatus === "ACTIVE" ? "Aktif" : "Pasif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <form action={toggleCompanyStatusAction.bind(null, company.id)}>
                    <Button variant="outline" size="sm" type="submit">
                      {company.subscriptionStatus === "ACTIVE" ? "Pasife Al" : "Aktifleştir"}
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            );
          })}
          {companies.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Henüz kayıtlı şirket yok.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
