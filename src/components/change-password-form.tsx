"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { changePasswordAction } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [error, formAction, isPending] = useActionState(changePasswordAction, undefined);
  const [justSaved, setJustSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !error) {
      formRef.current?.reset();
      setJustSaved(true);
    }
    wasPending.current = isPending;
  }, [isPending, error]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onChange={() => setJustSaved(false)}
      className="max-w-lg space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Mevcut Şifre</Label>
        <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">Yeni Şifre</Label>
        <Input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {justSaved && !error && <p className="text-sm text-emerald-600 dark:text-emerald-400">Şifreniz güncellendi.</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Kaydediliyor…" : "Şifreyi Değiştir"}
      </Button>
    </form>
  );
}
