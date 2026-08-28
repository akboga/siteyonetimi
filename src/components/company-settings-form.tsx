"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Action = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function CompanySettingsForm({
  action,
  defaultValues,
}: {
  action: Action;
  defaultValues: {
    name: string;
    taxNumber: string;
    contactEmail: string;
    contactPhone: string;
    billingAddress: string;
  };
}) {
  const [error, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Şirket Adı</Label>
          <Input id="name" name="name" required defaultValue={defaultValues.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxNumber">Vergi No</Label>
          <Input id="taxNumber" name="taxNumber" defaultValue={defaultValues.taxNumber} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">İletişim E-postası</Label>
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={defaultValues.contactEmail} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">İletişim Telefonu</Label>
          <Input id="contactPhone" name="contactPhone" defaultValue={defaultValues.contactPhone} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="billingAddress">Fatura Adresi</Label>
          <Input id="billingAddress" name="billingAddress" defaultValue={defaultValues.billingAddress} />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
      </Button>
    </form>
  );
}
