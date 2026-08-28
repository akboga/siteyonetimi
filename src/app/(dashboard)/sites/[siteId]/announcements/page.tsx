import { Plus, Megaphone } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { createAnnouncementAction, deleteAnnouncementAction } from "@/actions/announcements";
import { SiteSubNav } from "@/components/site-sub-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { AnnouncementFields } from "@/components/announcement-fields";

const audienceLabels: Record<string, string> = {
  TUM_SITE: "Tüm Site",
  BLOK: "Blok Bazlı",
  SECILI_DAIRELER: "Seçili Daireler",
};

export default async function SiteAnnouncementsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const user = await requireCompanyUser();
  const site = await assertSiteAccess(user, siteId);

  const [announcements, blocks, units] = await Promise.all([
    prisma.announcement.findMany({
      where: { siteId },
      orderBy: { publishDate: "desc" },
      include: { block: true, units: { include: { block: true } } },
    }),
    prisma.block.findMany({ where: { siteId }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({
      where: { siteId },
      orderBy: { unitNumber: "asc" },
      select: { id: true, unitNumber: true, block: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Duyurular</h1>
          <p className="text-sm text-muted-foreground">{site.name}</p>
        </div>
        <FormDialog
          triggerLabel={
            <>
              <Plus className="size-4" />
              Yeni Duyuru
            </>
          }
          title="Yeni Duyuru"
          action={createAnnouncementAction.bind(null, siteId)}
          submitLabel="Duyuruyu Yayınla"
        >
          <AnnouncementFields blocks={blocks} units={units} />
        </FormDialog>
      </div>

      <SiteSubNav siteId={siteId} />

      {announcements.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
          <Megaphone className="size-6" />
          <span>Henüz duyuru yayınlanmadı.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader className="flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{announcement.title}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(announcement.publishDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {audienceLabels[announcement.audience]}
                    {announcement.audience === "BLOK" && announcement.block ? ` · ${announcement.block.name}` : ""}
                    {announcement.audience === "SECILI_DAIRELER" ? ` · ${announcement.units.length} daire` : ""}
                  </Badge>
                  <form action={deleteAnnouncementAction.bind(null, siteId, announcement.id)}>
                    <ConfirmSubmitButton confirmMessage="Bu duyuruyu silmek istediğinize emin misiniz?">
                      Sil
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{announcement.content}</CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
