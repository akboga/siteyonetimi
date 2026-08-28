"use client";

import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  children,
  confirmMessage,
  variant = "destructive",
}: {
  children: React.ReactNode;
  confirmMessage: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  return (
    <Button
      type="submit"
      variant={variant}
      size="sm"
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </Button>
  );
}
