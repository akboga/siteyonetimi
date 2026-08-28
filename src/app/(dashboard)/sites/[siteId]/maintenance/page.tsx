import { Plus, Wrench, ClipboardCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  createMaintenanceScheduleAction,
  deleteMaintenanceScheduleAction,
  logMaintenanceAction,
  deleteMaintenanceLogAction,
} from "@/actions/maintenance";
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

const periodLabels: Record<string, string> = {
  AYLIK: "Aylık",
  UC_AYLIK: "3 Aylık",
  YILLIK: "Yıllık",
};

export default async function SiteMaintenancePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const user = await requireCompanyUser();
  const site = await assertSiteAccess(user, siteId);

  const schedules = await prisma.maintenanceSchedule.findMany({
    where: { siteId },
    include: { vendor: true, logs: { orderBy: { performedDate: "desc" }, take: 5 } },
    orderBy: { nextDueDate: "asc" },
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Bakım Takvimi</h1>
          <p className="text-sm text-muted-foreground">{site.name}</p>
        </div>
        <FormDialog
          triggerLabel={
            <>
              <Plus className="size-4" />
              Yeni Bakım Planı
            </>
          }
          title="Yeni Periyodik Bakım Planı"
          action={createMaintenanceScheduleAction.bind(null, siteId)}
          submitLabel="Planı Oluştur"
        >
          <div className="space-y-2">
            <Label htmlFor="equipment">Ekipman / Alan</Label>
            <Input id="equipment" name="equipment" placeholder="Asansör, Yangın Tesisatı, Jeneratör…" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="period">Periyot</Label>
            <Select name="period" defaultValue="AYLIK" items={periodLabels}>
              <SelectTrigger id="period" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(periodLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextDueDate">Sıradaki Bakım Tarihi</Label>
            <Input id="nextDueDate" name="nextDueDate" type="date" />
          </div>
        </FormDialog>
      </div>

      <SiteSubNav siteId={siteId} />

      {schedules.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
          <Wrench className="size-6" />
          <span>Henüz bakım planı yok.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {schedules.map((schedule) => {
            const overdue = schedule.nextDueDate ? schedule.nextDueDate < now : false;
            return (
              <Card key={schedule.id}>
                <CardHeader className="flex-row items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {schedule.equipment}
                      <Badge variant="outline">{periodLabels[schedule.period]}</Badge>
                      {overdue && <Badge variant="destructive">Gecikti</Badge>}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Son yapılma: {formatDate(schedule.lastDoneDate)} · Sıradaki: {formatDate(schedule.nextDueDate)}
                      {schedule.vendor && ` · ${schedule.vendor.name}`}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <FormDialog
                      triggerLabel={
                        <>
                          <ClipboardCheck className="size-4" />
                          Bakım Kaydı Ekle
                        </>
                      }
                      triggerVariant="outline"
                      title={`${schedule.equipment} — Bakım Kaydı`}
                      action={logMaintenanceAction.bind(null, schedule.id)}
                      submitLabel="Kaydı Ekle"
                    >
                      <div className="space-y-2">
                        <Label htmlFor={`perf-date-${schedule.id}`}>Yapılma Tarihi</Label>
                        <Input id={`perf-date-${schedule.id}`} name="performedDate" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`perf-by-${schedule.id}`}>Yapan Firma/Kişi</Label>
                        <Input id={`perf-by-${schedule.id}`} name="performedBy" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`perf-cost-${schedule.id}`}>Maliyet (₺)</Label>
                        <Input id={`perf-cost-${schedule.id}`} name="cost" type="number" step="0.01" min="0" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`perf-notes-${schedule.id}`}>Notlar</Label>
                        <Textarea id={`perf-notes-${schedule.id}`} name="notes" rows={2} />
                      </div>
                    </FormDialog>
                    <form action={deleteMaintenanceScheduleAction.bind(null, siteId, schedule.id)}>
                      <ConfirmSubmitButton confirmMessage="Bu bakım planını silmek istediğinize emin misiniz?">
                        Planı Sil
                      </ConfirmSubmitButton>
                    </form>
                  </div>

                  {schedule.logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Henüz bakım kaydı yok.</p>
                  ) : (
                    <div className="space-y-1">
                      {schedule.logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                          <div>
                            <p>{log.performedBy || "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(log.performedDate)}
                              {log.cost ? ` · ${formatCurrency(Number(log.cost))}` : ""}
                            </p>
                          </div>
                          <form action={deleteMaintenanceLogAction.bind(null, schedule.id, log.id)}>
                            <button type="submit" className="text-muted-foreground hover:text-destructive">
                              ×
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
