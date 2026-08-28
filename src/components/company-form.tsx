"use client";

import { useActionState } from "react";
import { createCompanyAction } from "@/actions/companies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function CompanyForm() {
  const [error, formAction, isPending] = useActionState(createCompanyAction, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-6">
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">Şirket Bilgileri</h2>
        <div className="space-y-2">
          <Label htmlFor="name">Şirket Adı</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxNumber">Vergi No</Label>
          <Input id="taxNumber" name="taxNumber" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">İletişim E-postası</Label>
          <Input id="contactEmail" name="contactEmail" type="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">İletişim Telefonu</Label>
          <Input id="contactPhone" name="contactPhone" />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">İlk Yönetici Hesabı</h2>
        <div className="space-y-2">
          <Label htmlFor="adminName">Ad Soyad</Label>
          <Input id="adminName" name="adminName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminEmail">E-posta</Label>
          <Input id="adminEmail" name="adminEmail" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminPassword">Şifre</Label>
          <Input id="adminPassword" name="adminPassword" type="password" required minLength={8} />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Oluşturuluyor…" : "Şirketi Oluştur"}
      </Button>
    </form>
  );
}
