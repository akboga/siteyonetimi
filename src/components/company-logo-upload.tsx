"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CompanyLogoUpload({ initialLogoUrl }: { initialLogoUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [error, setError] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(undefined);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const res = await fetch("/api/company-logo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Logo yüklenemedi.");
        return;
      }
      setLogoUrl(data.logoUrl);
      router.refresh();
    } catch {
      setError("Logo yüklenirken bir hata oluştu.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- yerel yüklenen logo, next/image için remotePatterns/optimizasyon gerekmiyor
          <img src={logoUrl} alt="Şirket logosu" className="size-full object-contain" />
        ) : (
          <ImageOff className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          id="company-logo-input"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" />
          {isUploading ? "Yükleniyor…" : logoUrl ? "Logoyu Değiştir" : "Logo Yükle"}
        </Button>
        <p className="text-xs text-muted-foreground">PNG veya JPG, en fazla 2 MB.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
