"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sprout, Receipt, Wallet, Droplets, Users, ListChecks, TrendingUp, FileText, UserCog, Settings, Menu, X } from "lucide-react";

const items = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/farms", label: "المزارع", icon: Sprout },
  { href: "/expenses", label: "المصروفات", icon: Receipt },
  { href: "/budget", label: "الميزانية", icon: Wallet },
  { href: "/irrigation", label: "الري والمياه", icon: Droplets },
  { href: "/labor", label: "العمالة والمهام", icon: Users },
    { href: "/tasks", label: "المهام", icon: ListChecks },
  { href: "/productivity", label: "الإنتاجية", icon: TrendingUp },
  { href: "/reports", label: "التقارير", icon: FileText },
  { href: "/members", label: "إدارة الأعضاء", icon: UserCog },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export default function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="القائمة" className="fixed right-3 top-3 z-30 rounded-lg bg-green-900 p-2 text-white md:hidden">
        <Menu size={20} />
      </button>
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 md:hidden" />}
      <aside className={`fixed right-0 top-0 z-40 flex h-screen w-56 flex-col gap-1 overflow-y-auto bg-green-900 p-4 text-white transition-transform md:translate-x-0 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="mb-4 flex items-center justify-between text-lg font-bold">
          Farm Intelligence
          <button onClick={() => setOpen(false)} aria-label="إغلاق" className="md:hidden"><X size={18} /></button>
        </div>
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${path === href ? "bg-green-700" : "hover:bg-green-800"}`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </aside>
    </>
  );
}