"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sprout, Receipt, Wallet, Droplets, Users, ListChecks, Boxes, TrendingUp, FileText, UserCog, Settings, Menu, X, Languages } from "lucide-react";
import { useLang, type Key } from "./i18n";

const items: { href: string; labelKey: Key; icon: React.ComponentType<{ size?: number }> }[] = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/farms", labelKey: "nav.farms", icon: Sprout },
  { href: "/expenses", labelKey: "nav.expenses", icon: Receipt },
  { href: "/budget", labelKey: "nav.budget", icon: Wallet },
  { href: "/irrigation", labelKey: "nav.irrigation", icon: Droplets },
  { href: "/labor", labelKey: "nav.labor", icon: Users },
  { href: "/tasks", labelKey: "nav.tasks", icon: ListChecks },
  { href: "/inventory", labelKey: "nav.inventory", icon: Boxes },
  { href: "/productivity", labelKey: "nav.productivity", icon: TrendingUp },
  { href: "/reports", labelKey: "nav.reports", icon: FileText },
  { href: "/members", labelKey: "nav.members", icon: UserCog },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export default function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { t, toggle } = useLang();
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={t("nav.menu")} className="fixed start-3 top-3 z-30 rounded-lg bg-green-900 p-2 text-white md:hidden">
        <Menu size={20} />
      </button>
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 md:hidden" />}
      <aside className={`fixed start-0 top-0 z-40 flex h-screen w-56 flex-col gap-1 overflow-y-auto bg-green-900 p-4 text-white transition-transform ${open ? "" : "max-md:rtl:translate-x-full max-md:ltr:-translate-x-full"}`}>
        <div className="mb-4 flex items-center justify-between text-lg font-bold">
          Farm Intelligence
          <button onClick={() => setOpen(false)} aria-label={t("nav.close")} className="md:hidden"><X size={18} /></button>
        </div>
        {items.map(({ href, labelKey, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${path === href ? "bg-green-700" : "hover:bg-green-800"}`}
          >
            <Icon size={18} />
            {t(labelKey)}
          </Link>
        ))}
        <button
          onClick={toggle}
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-green-800"
        >
          <Languages size={18} />
          {t("lang.switch")}
        </button>
      </aside>
    </>
  );
}