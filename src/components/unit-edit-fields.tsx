"use client";

import { useState } from "react";
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

export function UnitEditFields({
  defaultValues,
}: {
  defaultValues: {
    unitNumber: string;
    floor: string;
    type: string;
    roomLayout: string | null;
    areaM2: string;
  };
}) {
  const [type, setType] = useState(defaultValues.type);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="edit-unitNumber">Daire No</Label>
        <Input id="edit-unitNumber" name="unitNumber" required defaultValue={defaultValues.unitNumber} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-floor">Kat</Label>
        <Input id="edit-floor" name="floor" defaultValue={defaultValues.floor} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-type">Tip</Label>
        <Select name="type" defaultValue={defaultValues.type} items={typeLabels} onValueChange={(v) => setType(String(v))}>
          <SelectTrigger id="edit-type" className="w-full">
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
        <Label htmlFor="edit-roomLayout">Daire Boyutu</Label>
        <Select
          name="roomLayout"
          defaultValue={defaultValues.roomLayout ?? "BIR_ARTI_BIR"}
          items={roomLayoutLabels}
          disabled={type !== "MESKEN"}
        >
          <SelectTrigger id="edit-roomLayout" className="w-full">
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
        <Label htmlFor="edit-areaM2">Metrekare (m²)</Label>
        <Input id="edit-areaM2" name="areaM2" type="number" step="0.01" min="0" defaultValue={defaultValues.areaM2} />
      </div>
    </>
  );
}
