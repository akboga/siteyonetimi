"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  brandTag,
  navItems,
  user,
  roleLabel,
  logoutAction,
  children,
}: {
  brandTag?: string;
  navItems: NavItem[];
  user: { name: string; email: string };
  roleLabel: string;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (onNavigate?: () => void) => (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userPanel = (
    <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-lg bg-sidebar-accent/60 p-2.5">
      <Avatar size="sm" className="shrink-0">
        <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-foreground">
          {initials(user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
        <p className="truncate text-xs text-sidebar-foreground/60">{roleLabel}</p>
      </div>
      <form action={logoutAction}>
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          aria-label="Çıkış Yap"
        >
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );

  const brand = (
    <div className="flex items-center gap-2.5 px-4 pt-5 pb-6">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.42_0.19_290)] text-sm font-bold text-primary-foreground">
        A
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-sidebar-foreground">Apsis</p>
        {brandTag && (
          <p className="truncate text-[11px] text-sidebar-foreground/55">{brandTag}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-muted/30 print:bg-white">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex print:hidden">
        {brand}
        {nav()}
        {userPanel}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="relative flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                onClick={() => setMobileOpen(false)}
                aria-label="Menüyü kapat"
              >
                <X className="size-4" />
              </Button>
            </div>
            {nav(() => setMobileOpen(false))}
            {userPanel}
          </aside>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-background px-4 py-3 md:hidden print:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu className="size-4" />
          </Button>
          <span className="text-sm font-semibold">Apsis</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 print:p-0">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
