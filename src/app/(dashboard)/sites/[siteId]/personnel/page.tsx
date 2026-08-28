import { Plus, Users, SearchX } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import {
  createSitePersonnelAction,
  updateSitePersonnelAction,
  deleteSitePersonnelAction,
} from "@/actions/site-staff";
import { SiteSubNav } from "@/components/site-sub-nav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ListSearch } from "@/components/list-search";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SitePersonnelPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { siteId } = await params;
  const { q } = await searchParams;
  const user = await requireCompanyUser();
  const site = await assertSiteAccess(user, siteId);

  const staff = await prisma.staff.findMany({
    where: {
      siteId,
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { position: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Site Personeli</h1>
          <p className="text-sm text-muted-foreground">{site.name} · Kapıcı, güvenlik, bahçıvan vb.</p>
        </div>
        <FormDialog
          triggerLabel={
            <>
              <Plus className="size-4" />
              Yeni Personel
            </>
          }
          title="Yeni Site Personeli"
          action={createSitePersonnelAction.bind(null, siteId)}
          submitLabel="Personeli Ekle"
        >
          <div className="space-y-2">
            <Label htmlFor="fullName">Ad Soyad</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Görev</Label>
            <Input id="position" name="position" placeholder="Kapıcı, Güvenlik, Bahçıvan…" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hireDate">İşe Giriş Tarihi</Label>
            <Input id="hireDate" name="hireDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salaryInfo">Maaş (₺, opsiyonel)</Label>
            <Input id="salaryInfo" name="salaryInfo" type="number" step="0.01" min="0" />
          </div>
        </FormDialog>
      </div>

      <SiteSubNav siteId={siteId} />

      <ListSearch placeholder="Ad veya görev ara…" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ad Soyad</TableHead>
            <TableHead>Görev</TableHead>
            <TableHead>İşe Giriş</TableHead>
            <TableHead>Maaş</TableHead>
            <TableHead className="text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.fullName}</TableCell>
              <TableCell>{member.position}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(member.hireDate)}</TableCell>
              <TableCell className="text-muted-foreground">
                {member.salaryInfo ? formatCurrency(Number(member.salaryInfo)) : "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <FormDialog
                    triggerLabel="Düzenle"
                    triggerVariant="outline"
                    title={`${member.fullName} — Düzenle`}
                    action={updateSitePersonnelAction.bind(null, siteId, member.id)}
                    submitLabel="Kaydet"
                  >
                    <div className="space-y-2">
                      <Label htmlFor={`fullName-${member.id}`}>Ad Soyad</Label>
                      <Input id={`fullName-${member.id}`} name="fullName" defaultValue={member.fullName} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`position-${member.id}`}>Görev</Label>
                      <Input id={`position-${member.id}`} name="position" defaultValue={member.position} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`hireDate-${member.id}`}>İşe Giriş Tarihi</Label>
                      <Input
                        id={`hireDate-${member.id}`}
                        name="hireDate"
                        type="date"
                        defaultValue={member.hireDate ? toDateInputValue(member.hireDate) : undefined}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`salaryInfo-${member.id}`}>Maaş (₺)</Label>
                      <Input
                        id={`salaryInfo-${member.id}`}
                        name="salaryInfo"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={member.salaryInfo ? Number(member.salaryInfo) : undefined}
                      />
                    </div>
                  </FormDialog>
                  <form action={deleteSitePersonnelAction.bind(null, siteId, member.id)}>
                    <ConfirmSubmitButton confirmMessage="Bu personel kaydını silmek istediğinize emin misiniz?">
                      Sil
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {staff.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  {q ? (
                    <>
                      <SearchX className="size-6" />
                      <span>Aramayla eşleşen personel bulunamadı.</span>
                    </>
                  ) : (
                    <>
                      <Users className="size-6" />
                      <span>Henüz site personeli eklenmedi.</span>
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
