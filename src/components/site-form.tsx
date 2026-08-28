"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SiteFormAction = (
  prevState: string | undefined,
  formData: FormData,
) => Promise<string | undefined>;

export function SiteForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: SiteFormAction;
  defaultValues?: { name: string; address: string; managementPlanNo: string; lateFeeRatePercent?: string };
  submitLabel: string;
}) {
  const [error, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Site Adı</Label>
        <Input id="name" name="name" required defaultValue={defaultValues?.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Adres</Label>
        <Input id="address" name="address" defaultValue={defaultValues?.address} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="managementPlanNo">Yönetim Planı / Karar Defteri No</Label>
        <Input id="managementPlanNo" name="managementPlanNo" defaultValue={defaultValues?.managementPlanNo} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lateFeeRatePercent">Aylık Gecikme Faizi (%)</Label>
        <Input
          id="lateFeeRatePercent"
          name="lateFeeRatePercent"
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="Örn. 2.5"
          defaultValue={defaultValues?.lateFeeRatePercent}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Kaydediliyor…" : submitLabel}
      </Button>
    </form>
  );
}
