"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateOwnProfileAction } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  defaultValues,
}: {
  defaultValues: { name: string; email: string };
}) {
  const [error, formAction, isPending] = useActionState(updateOwnProfileAction, undefined);
  const [justSaved, setJustSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !error) {
      setJustSaved(true);
    }
    wasPending.current = isPending;
  }, [isPending, error]);

  return (
    <form action={formAction} onChange={() => setJustSaved(false)} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="profile-name">Ad Soyad</Label>
        <Input id="profile-name" name="name" required defaultValue={defaultValues.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-email">Kullanıcı Adı (E-posta)</Label>
        <Input id="profile-email" name="email" type="email" required defaultValue={defaultValues.email} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {justSaved && !error && <p className="text-sm text-emerald-600 dark:text-emerald-400">Bilgileriniz güncellendi.</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Kaydediliyor…" : "Bilgileri Kaydet"}
      </Button>
    </form>
  );
}
