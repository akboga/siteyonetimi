import { Plus, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { getTicketStats } from "@/lib/reports";
import { formatDate } from "@/lib/format";
import {
  createTicketAction,
  updateTicketStatusAction,
  assignTicketAction,
  deleteTicketAction,
} from "@/actions/tickets";
import { SiteSubNav } from "@/components/site-sub-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ListSearch } from "@/components/list-search";
import { ListFilter } from "@/components/list-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const priorityLabels: Record<string, string> = {
  DUSUK: "Düşük",
  ORTA: "Orta",
  YUKSEK: "Yüksek",
  ACIL: "Acil",
};

const priorityVariant: Record<string, "secondary" | "outline" | "default" | "destructive"> = {
  DUSUK: "secondary",
  ORTA: "outline",
  YUKSEK: "default",
  ACIL: "destructive",
};

const statusLabels: Record<string, string> = {
  ACIK: "Açık",
  ISLEMDE: "İşlemde",
  COZULDU: "Çözüldü",
  IPTAL: "İptal",
};

const statusVariant: Record<string, "secondary" | "outline" | "default" | "destructive"> = {
  ACIK: "destructive",
  ISLEMDE: "default",
  COZULDU: "secondary",
  IPTAL: "outline",
};

export default async function SiteTicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ q?: string; status?: string; priority?: string }>;
}) {
  const { siteId } = await params;
  const { q, status, priority } = await searchParams;
  const user = await requireCompanyUser();
  const site = await assertSiteAccess(user, siteId);

  const [tickets, units, stats] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        siteId,
        ...(status ? { status: status as "ACIK" | "ISLEMDE" | "COZULDU" | "IPTAL" } : {}),
        ...(priority ? { priority: priority as "DUSUK" | "ORTA" | "YUKSEK" | "ACIL" } : {}),
        ...(q
          ? {
              OR: [
                { category: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { assignedTo: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { unit: { include: { block: true } } },
      orderBy: { openedAt: "desc" },
    }),
    prisma.unit.findMany({ where: { siteId }, orderBy: { unitNumber: "asc" }, include: { block: true } }),
    getTicketStats(siteId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Arıza / Talep Yönetimi</h1>
          <p className="text-sm text-muted-foreground">{site.name}</p>
        </div>
        <FormDialog
          triggerLabel={
            <>
              <Plus className="size-4" />
              Yeni Talep
            </>
          }
          title="Yeni Arıza / Talep Kaydı"
          action={createTicketAction.bind(null, siteId)}
          submitLabel="Talebi Oluştur"
        >
          <div className="space-y-2">
            <Label htmlFor="reportedBy">Bildiren Kişi</Label>
            <Input id="reportedBy" name="reportedBy" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Kategori</Label>
            <Input id="category" name="category" placeholder="Asansör, Su Tesisatı, Elektrik…" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" name="description" rows={3} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Öncelik</Label>
            <Select name="priority" defaultValue="ORTA" items={priorityLabels}>
              <SelectTrigger id="priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {units.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="unitId">Daire (opsiyonel)</Label>
              <Select
                name="unitId"
                items={Object.fromEntries(
                  units.map((unit) => [unit.id, `${unit.block ? `${unit.block.name} / ` : ""}${unit.unitNumber}`]),
                )}
              >
                <SelectTrigger id="unitId" className="w-full">
                  <SelectValue placeholder="Daire seçilmedi" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.block ? `${unit.block.name} / ` : ""}
                      {unit.unitNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </FormDialog>
      </div>

      <SiteSubNav siteId={siteId} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">Açık</p>
          <p className="text-xl font-semibold">{stats.counts.ACIK}</p>
        </div>
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">İşlemde</p>
          <p className="text-xl font-semibold">{stats.counts.ISLEMDE}</p>
        </div>
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">Çözüldü</p>
          <p className="text-xl font-semibold">{stats.counts.COZULDU}</p>
        </div>
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">İptal</p>
          <p className="text-xl font-semibold">{stats.counts.IPTAL}</p>
        </div>
        <div className="rounded-xl bg-card p-3 text-center ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">Ort. Çözüm (saat)</p>
          <p className="text-xl font-semibold">{stats.avgResolutionHours ?? "—"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ListSearch placeholder="Kategori, açıklama veya atanan ara…" />
        <ListFilter
          paramName="status"
          label="Tüm Durumlar"
          options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
        />
        <ListFilter
          paramName="priority"
          label="Tüm Öncelikler"
          options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kategori</TableHead>
            <TableHead>Daire</TableHead>
            <TableHead>Öncelik</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Atanan</TableHead>
            <TableHead>Açılış</TableHead>
            <TableHead className="text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell>
                <p className="font-medium">{ticket.category}</p>
                <p className="max-w-52 truncate text-xs text-muted-foreground">{ticket.description}</p>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {ticket.unit ? `${ticket.unit.block ? `${ticket.unit.block.name} / ` : ""}${ticket.unit.unitNumber}` : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={priorityVariant[ticket.priority]}>{priorityLabels[ticket.priority]}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant[ticket.status]}>{statusLabels[ticket.status]}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{ticket.assignedTo ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(ticket.openedAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-1.5">
                  {ticket.status === "ACIK" && (
                    <FormDialog
                      triggerLabel="Ata"
                      triggerVariant="outline"
                      title="Talebi Ata"
                      action={assignTicketAction.bind(null, siteId, ticket.id)}
                      submitLabel="Ata"
                    >
                      <div className="space-y-2">
                        <Label htmlFor={`assign-${ticket.id}`}>Atanan Kişi/Firma</Label>
                        <Input id={`assign-${ticket.id}`} name="assignedTo" required />
                      </div>
                    </FormDialog>
                  )}
                  {ticket.status === "ISLEMDE" && (
                    <form action={updateTicketStatusAction.bind(null, siteId, ticket.id, "COZULDU")}>
                      <Button type="submit" variant="outline" size="sm">
                        Çözüldü
                      </Button>
                    </form>
                  )}
                  {(ticket.status === "ACIK" || ticket.status === "ISLEMDE") && (
                    <form action={updateTicketStatusAction.bind(null, siteId, ticket.id, "IPTAL")}>
                      <Button type="submit" variant="ghost" size="sm">
                        İptal
                      </Button>
                    </form>
                  )}
                  <form action={deleteTicketAction.bind(null, siteId, ticket.id)}>
                    <ConfirmSubmitButton confirmMessage="Bu talebi silmek istediğinize emin misiniz?">
                      Sil
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {tickets.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <AlertTriangle className="size-6" />
                  <span>
                    {q || status || priority
                      ? "Aramayla eşleşen talep/arıza bulunamadı."
                      : "Henüz talep/arıza kaydı yok."}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
