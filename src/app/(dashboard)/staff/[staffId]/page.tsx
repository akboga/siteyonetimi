import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { toggleStaffActiveAction, updateStaffSiteAccessAction } from "@/actions/staff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ staffId: string }>;
}) {
  const { staffId } = await params;
  const admin = await requireRole("COMPANY_ADMIN");

  const staff = await prisma.user.findUnique({
    where: { id: staffId },
    include: { siteAccess: true },
  });
  if (!staff || staff.companyId !== admin.companyId || staff.role !== "COMPANY_STAFF") notFound();

  const sites = await prisma.site.findMany({
    where: { companyId: admin.companyId! },
    orderBy: { name: "asc" },
  });
  const accessibleSiteIds = new Set(staff.siteAccess.map((a) => a.siteId));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{staff.name}</h1>
          <p className="text-sm text-muted-foreground">
            {staff.email}
            {staff.phone && ` · ${staff.phone}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={staff.isActive ? "default" : "secondary"}>
            {staff.isActive ? "Aktif" : "Pasif"}
          </Badge>
          <form action={toggleStaffActiveAction.bind(null, staff.id)}>
            <Button variant="outline" size="sm" type="submit">
              {staff.isActive ? "Pasife Al" : "Aktifleştir"}
            </Button>
          </form>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Site Erişimi</h2>
          <p className="text-sm text-muted-foreground">
            Bu personelin görüntüleyip yönetebileceği siteleri seçin.
          </p>
        </div>
        {sites.length === 0 ? (
          <p className="text-sm text-muted-foreground">Şirketinize kayıtlı site yok.</p>
        ) : (
          <form action={updateStaffSiteAccessAction.bind(null, staff.id)} className="space-y-3">
            <div className="space-y-2">
              {sites.map((site) => (
                <label key={site.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    key={accessibleSiteIds.has(site.id) ? "checked" : "unchecked"}
                    name="siteIds"
                    value={site.id}
                    defaultChecked={accessibleSiteIds.has(site.id)}
                  />
                  <Label className="font-normal">{site.name}</Label>
                </label>
              ))}
            </div>
            <Button type="submit" size="sm">
              Erişimi Kaydet
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
