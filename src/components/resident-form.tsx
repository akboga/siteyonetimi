"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ResidentForm({
  action,
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
}) {
  const [error, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="fullName">Ad Soyad</Label>
        <Input id="fullName" name="fullName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="relationType">İlişki</Label>
        <Select name="relationType" defaultValue="MALIK" items={{ MALIK: "Malik", KIRACI: "Kiracı" }}>
          <SelectTrigger id="relationType" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MALIK">Malik</SelectItem>
            <SelectItem value="KIRACI">Kiracı</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input id="phone" name="phone" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nationalId">TC Kimlik No</Label>
        <Input id="nationalId" name="nationalId" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="moveInDate">Taşınma Tarihi</Label>
        <Input id="moveInDate" name="moveInDate" type="date" />
      </div>
      {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <Button type="submit" disabled={isPending} className="sm:col-span-2">
        {isPending ? "Kaydediliyor…" : "Sakin Ekle"}
      </Button>
    </form>
  );
}
