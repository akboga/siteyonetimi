import { Plus, Gavel, CalendarClock } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import {
  createMeetingAction,
  deleteMeetingAction,
  createDecisionAction,
  deleteDecisionAction,
} from "@/actions/meetings";
import { SiteSubNav } from "@/components/site-sub-nav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default async function SiteMeetingsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const user = await requireCompanyUser();
  const site = await assertSiteAccess(user, siteId);

  const [meetings, decisions] = await Promise.all([
    prisma.meeting.findMany({ where: { siteId }, orderBy: { date: "desc" } }),
    prisma.decision.findMany({ where: { siteId }, orderBy: { date: "desc" }, include: { meeting: true } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Toplantı ve Karar Defteri</h1>
          <p className="text-sm text-muted-foreground">{site.name}</p>
        </div>
      </div>

      <SiteSubNav siteId={siteId} />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Toplantılar</h2>
          <FormDialog
            triggerLabel={
              <>
                <Plus className="size-4" />
                Yeni Toplantı
              </>
            }
            title="Yeni Toplantı"
            action={createMeetingAction.bind(null, siteId)}
            submitLabel="Toplantıyı Kaydet"
          >
            <div className="space-y-2">
              <Label htmlFor="date">Tarih</Label>
              <Input id="date" name="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agenda">Gündem</Label>
              <Textarea id="agenda" name="agenda" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="participants">Katılımcılar</Label>
              <Textarea id="participants" name="participants" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutesText">Tutanak Metni</Label>
              <Textarea id="minutesText" name="minutesText" rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutesFileUrl">Tutanak Dosya Bağlantısı</Label>
              <Input id="minutesFileUrl" name="minutesFileUrl" type="url" placeholder="https://…" />
            </div>
          </FormDialog>
        </div>

        {meetings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz toplantı kaydı yok.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {meetings.map((meeting) => (
              <Card key={meeting.id}>
                <CardHeader className="flex-row items-start justify-between pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CalendarClock className="size-4 text-muted-foreground" />
                    {formatDate(meeting.date)}
                  </CardTitle>
                  <form action={deleteMeetingAction.bind(null, siteId, meeting.id)}>
                    <button type="submit" className="text-xs text-muted-foreground hover:text-destructive">
                      Sil
                    </button>
                  </form>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  {meeting.agenda && <p><span className="text-foreground">Gündem:</span> {meeting.agenda}</p>}
                  {meeting.participants && <p><span className="text-foreground">Katılımcılar:</span> {meeting.participants}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Kararlar</h2>
          <FormDialog
            triggerLabel={
              <>
                <Plus className="size-4" />
                Yeni Karar
              </>
            }
            title="Yeni Yönetim Kurulu Kararı"
            action={createDecisionAction.bind(null, siteId)}
            submitLabel="Kararı Kaydet"
          >
            <div className="space-y-2">
              <Label htmlFor="decisionNumber">Karar No</Label>
              <Input id="decisionNumber" name="decisionNumber" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decision-date">Tarih</Label>
              <Input id="decision-date" name="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="text">Karar Metni</Label>
              <Textarea id="text" name="text" rows={3} required />
            </div>
            {meetings.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="meetingId">İlgili Toplantı (opsiyonel)</Label>
                <Select
                  name="meetingId"
                  items={Object.fromEntries(meetings.map((m) => [m.id, formatDate(m.date)]))}
                >
                  <SelectTrigger id="meetingId" className="w-full">
                    <SelectValue placeholder="Toplantı seçilmedi" />
                  </SelectTrigger>
                  <SelectContent>
                    {meetings.map((meeting) => (
                      <SelectItem key={meeting.id} value={meeting.id}>
                        {formatDate(meeting.date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </FormDialog>
        </div>

        {decisions.length === 0 ? (
          <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
            <Gavel className="size-6" />
            <span>Henüz karar kaydı yok.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {decisions.map((decision) => (
              <div key={decision.id} className="flex items-start justify-between gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{decision.decisionNumber}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(decision.date)}</span>
                    {decision.meeting && (
                      <span className="text-xs text-muted-foreground">· {formatDate(decision.meeting.date)} toplantısı</span>
                    )}
                  </div>
                  <p className="text-sm">{decision.text}</p>
                </div>
                <form action={deleteDecisionAction.bind(null, siteId, decision.id)}>
                  <ConfirmSubmitButton confirmMessage="Bu kararı silmek istediğinize emin misiniz?">
                    Sil
                  </ConfirmSubmitButton>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
