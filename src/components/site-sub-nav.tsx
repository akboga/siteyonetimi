"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ReceiptText,
  Wallet,
  PiggyBank,
  Landmark,
  Wrench,
  AlertTriangle,
  Users,
  Gavel,
  FolderOpen,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function SiteSubNav({ siteId }: { siteId: string }) {
  const pathname = usePathname();
  const base = `/sites/${siteId}`;

  const tabs = [
    { href: base, label: "Genel Bakış", icon: LayoutGrid, exact: true },
    { href: `${base}/dues`, label: "Aidat", icon: ReceiptText },
    { href: `${base}/expenses`, label: "Giderler", icon: Wallet },
    { href: `${base}/budget`, label: "Bütçe", icon: PiggyBank },
    { href: `${base}/bank-accounts`, label: "Kasa/Banka", icon: Landmark },
    { href: `${base}/maintenance`, label: "Bakım", icon: Wrench },
    { href: `${base}/tickets`, label: "Arızalar", icon: AlertTriangle },
    { href: `${base}/personnel`, label: "Personel", icon: Users },
    { href: `${base}/meetings`, label: "Toplantı/Karar", icon: Gavel },
    { href: `${base}/documents`, label: "Dokümanlar", icon: FolderOpen },
    { href: `${base}/announcements`, label: "Duyurular", icon: Megaphone },
  ];

  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
