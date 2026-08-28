import Link from "next/link";
import { Plus, Users, UserX } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSearch } from "@/components/list-search";
import { ListFilter } from "@/components/list-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusOptions = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Pasif" },
];

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const admin = await requireRole("COMPANY_ADMIN");

  const staff = await prisma.user.findMany({
    where: {
      companyId: admin.companyId!,
      role: "COMPANY_STAFF",
      ...(status === "active" ? { isActive: true } : {}),
      ...(status === "inactive" ? { isActive: false } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { siteAccess: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Personel</h1>
          <p className="text-sm text-muted-foreground">
            Şirket personeli oluşturun ve hangi sitelere erişebileceklerini belirleyin
          </p>
        </div>
        <Button
          render={
            <Link href="/staff/new">
              <Plus className="size-4" />
              Yeni Personel
            </Link>
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ListSearch placeholder="Ad, e-posta veya telefon ara…" />
        <ListFilter paramName="status" label="Tüm Durumlar" options={statusOptions} />
        <p className="ml-auto text-sm text-muted-foreground">{staff.length} personel</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ad Soyad</TableHead>
            <TableHead>E-posta</TableHead>
            <TableHead>Site Erişimi</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead className="text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.name}</TableCell>
              <TableCell>
                <p>{member.email}</p>
                {member.phone && <p className="text-xs text-muted-foreground">{member.phone}</p>}
              </TableCell>
              <TableCell>{member._count.siteAccess} site</TableCell>
              <TableCell>
                <Badge variant={member.isActive ? "default" : "secondary"}>
                  {member.isActive ? "Aktif" : "Pasif"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/staff/${member.id}`}>Yetkileri Düzenle</Link>}
                />
              </TableCell>
            </TableRow>
          ))}
          {staff.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  {q || status ? (
                    <>
                      <UserX className="size-6" />
                      <span>Aramayla eşleşen personel bulunamadı.</span>
                    </>
                  ) : (
                    <>
                      <Users className="size-6" />
                      <span>Henüz personel eklenmedi.</span>
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
