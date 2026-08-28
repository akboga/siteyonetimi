"use client";

import { useActionState, useState } from "react";
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

const typeLabels: Record<string, string> = {
  MESKEN: "Mesken (Daire)",
  ISYERI: "İşyeri (Dükkan)",
  DEPO: "Depo",
  DIGER: "Diğer",
};

const roomLayoutLabels: Record<string, string> = {
  BIR_ARTI_BIR: "1+1",
  IKI_ARTI_BIR: "2+1",
  UC_ARTI_BIR: "3+1",
  DIGER: "Diğer",
};

const BLOCK_LETTER_SUGGESTIONS = ["A", "B", "C", "D", "E", "F"];

export function UnitForm({
  action,
  blocks,
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  blocks: { id: string; name: string }[];
}) {
  const [error, formAction, isPending] = useActionState(action, undefined);
  const [type, setType] = useState("MESKEN");

  const blockSuggestions = [
    ...blocks.map((b) => b.name),
    ...BLOCK_LETTER_SUGGESTIONS.filter((letter) => !blocks.some((b) => b.name === letter)),
  ];

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="unitNumber">Daire No</Label>
        <Input id="unitNumber" name="unitNumber" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="floor">Kat</Label>
        <Input id="floor" name="floor" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="blockName">Blok (opsiyonel)</Label>
        <Input id="blockName" name="blockName" list="block-suggestions" placeholder="Örn. A, Kuzey Blok…" />
        <datalist id="block-suggestions">
          {blockSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tip</Label>
        <Select name="type" defaultValue="MESKEN" items={typeLabels} onValueChange={(v) => setType(String(v))}>
          <SelectTrigger id="type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(typeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="roomLayout">Daire Boyutu</Label>
        <Select name="roomLayout" defaultValue="BIR_ARTI_BIR" items={roomLayoutLabels} disabled={type !== "MESKEN"}>
          <SelectTrigger id="roomLayout" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(roomLayoutLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {type !== "MESKEN" && <p className="text-xs text-muted-foreground">Sadece mesken tipinde geçerlidir.</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="areaM2">Metrekare (m²)</Label>
        <Input id="areaM2" name="areaM2" type="number" step="0.01" min="0" />
      </div>

      <div className="border-t pt-4 sm:col-span-2">
        <p className="text-sm font-medium">Sakin Bilgileri</p>
      </div>

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
        <Label htmlFor="phone">Telefon No</Label>
        <Input id="phone" name="phone" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" name="email" type="email" />
      </div>

      {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <Button type="submit" disabled={isPending} className="sm:col-span-2">
        {isPending ? "Kaydediliyor…" : "Daire Ekle"}
      </Button>
    </form>
  );
}
