"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sprout, Receipt, Wallet, Droplets, Users, TrendingUp, FileText, UserCog, Settings } from "lucide-react";

const items = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/farms", label: "المزارع", icon: Sprout },
  { href: "/expenses", label: "المصروفات", icon: Receipt },
  { href: "/budget", label: "الميزانية", icon: Wallet },
  { href: "/irrigation", label: "الري والمياه", icon: Droplets },
  { href: "/labor", label: "العمالة والمهام", icon: Users },
  { href: "/productivity", label: "الإنتاجية", icon: TrendingUp },
  { href: "/reports", label: "التقارير", icon: FileText },
  { href: "/members", label: "إدارة الأعضاء", icon: UserCog },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed right-0 top-0 flex h-screen w-56 flex-col gap-1 bg-green-900 p-4 text-white">
      <div className="mb-4 text-lg font-bold">Farm Intelligence</div>
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${path === href ? "bg-green-700" : "hover:bg-green-800"}`}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </aside>
  );
}