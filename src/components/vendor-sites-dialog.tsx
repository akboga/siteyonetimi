"use client";

import { Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function VendorSitesDialog({
  vendorName,
  sites,
  assignedSiteIds,
  action,
}: {
  vendorName: string;
  sites: { id: string; name: string }[];
  assignedSiteIds: Set<string>;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        <Building2 className="size-4" />
        Siteler
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{vendorName} — Siteler</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border p-2.5">
            {sites.map((site) => (
              <label key={site.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  key={assignedSiteIds.has(site.id) ? "checked" : "unchecked"}
                  name="siteIds"
                  value={site.id}
                  defaultChecked={assignedSiteIds.has(site.id)}
                />
                <Label className="font-normal">{site.name}</Label>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button type="submit">Kaydet</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
