"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { VariantProps } from "class-variance-authority";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";

type FormAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function FormDialog({
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "sm",
  title,
  description,
  action,
  submitLabel = "Kaydet",
  children,
}: {
  triggerLabel: React.ReactNode;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerSize?: VariantProps<typeof buttonVariants>["size"];
  title: string;
  description?: string;
  action: FormAction;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, formAction, isPending] = useActionState(action, undefined);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !error) {
      setOpen(false);
    }
    wasPending.current = isPending;
  }, [isPending, error]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Styled directly (not a nested <Button> via DialogTrigger's render prop) —
          Button hardcodes data-slot="button", which fights the "dialog-trigger" slot
          base-ui sets on this element and causes a hydration mismatch. A <Button>
          element from a Server Component parent also can't have its props introspected
          here, since it crosses the server/client boundary as an opaque reference. */}
      <DialogTrigger className={buttonVariants({ variant: triggerVariant, size: triggerSize })}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {children}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
