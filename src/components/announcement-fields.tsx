"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const audienceLabels: Record<string, string> = {
  TUM_SITE: "Tüm Site",
  BLOK: "Blok Bazlı",
  SECILI_DAIRELER: "Seçili Daireler",
};

export function AnnouncementFields({
  blocks,
  units,
}: {
  blocks: { id: string; name: string }[];
  units: { id: string; unitNumber: string; block: { name: string } | null }[];
}) {
  const [audience, setAudience] = useState("TUM_SITE");

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Başlık</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">İçerik</Label>
        <Textarea id="content" name="content" rows={3} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="audience">Hedef Kitle</Label>
        <Select
          name="audience"
          value={audience}
          onValueChange={(value) => setAudience(value as string)}
          items={audienceLabels}
        >
          <SelectTrigger id="audience" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(audienceLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {audience === "BLOK" && blocks.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="blockId">Blok</Label>
          <Select name="blockId" items={Object.fromEntries(blocks.map((b) => [b.id, b.name]))}>
            <SelectTrigger id="blockId" className="w-full">
              <SelectValue placeholder="Blok seçin" />
            </SelectTrigger>
            <SelectContent>
              {blocks.map((block) => (
                <SelectItem key={block.id} value={block.id}>
                  {block.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {audience === "SECILI_DAIRELER" && units.length > 0 && (
        <div className="space-y-2">
          <Label>Daireler</Label>
          <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border p-2.5">
            {units.map((unit) => (
              <label key={unit.id} className="flex items-center gap-2 text-sm">
                <Checkbox name="unitIds" value={unit.id} />
                {unit.block ? `${unit.block.name} / ` : ""}
                {unit.unitNumber}
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
