import { Plus, FolderOpen, ExternalLink, SearchX } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { assertSiteAccess } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { createDocumentAction, deleteDocumentAction } from "@/actions/documents";
import { SiteSubNav } from "@/components/site-sub-nav";
import { Button } from "@/components/ui/button";
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

export default async function SiteDocumentsPage({
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

  const documents = await prisma.document.findMany({
    where: {
      siteId,
      ...(q
        ? {
            OR: [
              { type: { contains: q, mode: "insensitive" } },
              { uploadedBy: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Doküman Arşivi</h1>
          <p className="text-sm text-muted-foreground">{site.name}</p>
        </div>
        <FormDialog
          triggerLabel={
            <>
              <Plus className="size-4" />
              Doküman Ekle
            </>
          }
          title="Yeni Doküman"
          action={createDocumentAction.bind(null, siteId)}
          submitLabel="Dokümanı Ekle"
        >
          <div className="space-y-2">
            <Label htmlFor="type">Doküman Türü</Label>
            <Input id="type" name="type" placeholder="Yönetim Planı, Sigorta Poliçesi, Sözleşme…" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fileUrl">Dosya Bağlantısı</Label>
            <Input id="fileUrl" name="fileUrl" type="url" placeholder="https://…" required />
          </div>
        </FormDialog>
      </div>

      <SiteSubNav siteId={siteId} />

      <ListSearch placeholder="Doküman türü veya yükleyen ara…" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tür</TableHead>
            <TableHead>Yükleyen</TableHead>
            <TableHead>Tarih</TableHead>
            <TableHead>Dosya</TableHead>
            <TableHead className="text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">{doc.type}</TableCell>
              <TableCell className="text-muted-foreground">{doc.uploadedBy ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(doc.uploadedAt)}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  render={
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Görüntüle
                    </a>
                  }
                />
              </TableCell>
              <TableCell className="text-right">
                <form action={deleteDocumentAction.bind(null, siteId, doc.id)}>
                  <ConfirmSubmitButton confirmMessage="Bu dokümanı silmek istediğinize emin misiniz?">
                    Sil
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {documents.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  {q ? (
                    <>
                      <SearchX className="size-6" />
                      <span>Aramayla eşleşen doküman bulunamadı.</span>
                    </>
                  ) : (
                    <>
                      <FolderOpen className="size-6" />
                      <span>Henüz doküman eklenmedi.</span>
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
