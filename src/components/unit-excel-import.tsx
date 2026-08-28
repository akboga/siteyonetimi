"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type ImportResult = { created: number; errors: { row: number; message: string }[] };

export function UnitExcelImport({ siteId }: { siteId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | undefined>();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(undefined);
    setResult(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/sites/${siteId}/units/import`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "İçe aktarma başarısız oldu.");
        return;
      }
      setResult(data);
      if (data.created > 0) router.refresh();
    } catch {
      setError("İçe aktarma sırasında bir hata oluştu.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          render={<a href={`/api/sites/${siteId}/units/template`} download />}
        >
          <Download className="size-4" />
          Şablon İndir
        </Button>
        <input ref={inputRef} type="file" accept=".xlsx" className="hidden" id="unit-excel-input" onChange={handleFileChange} />
        <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" />
          {isUploading ? "Yükleniyor…" : "Excel'den İçe Aktar"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <div className="rounded-lg bg-muted/60 p-3 text-sm">
          <p className="font-medium">{result.created} daire başarıyla eklendi.</p>
          {result.errors.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-destructive">
              {result.errors.map((e, i) => (
                <li key={i}>
                  Satır {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
