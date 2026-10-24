"use client";

import { LogOut } from "lucide-react";
import { useData } from "../use-data";

const ROLES: Record<string, string> = {
  owner: "مالك", farm_manager: "مدير مزرعة", accountant: "محاسب",
  supervisor: "مشرف", analyst: "محلل", viewer: "مشاهد",
};

export default function SettingsPage() {
  const { loading, orgName, role, farms, expenses, error, signOut } = useData();

  if (loading) return <p className="text-zinc-500">جارٍ التحميل...</p>;

  const rows = [
    ["اسم المؤسسة", orgName || "—"],
    ["دورك", ROLES[role] ?? (role || "—")],
    ["عدد المزارع", String(farms.length)],
    ["عدد سجلات المصروفات", String(expenses.length)],
    ["العملة", "AED"],
  ];

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">الإعدادات</h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="max-w-xl rounded-xl border border-zinc-200 p-4">
        <p className="mb-3 font-medium">معلومات الحساب</p>
        <dl className="text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between border-t border-zinc-100 py-2 first:border-t-0">
              <dt className="text-zinc-500">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <button onClick={signOut} className="mt-6 flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100">
        <LogOut size={16} />تسجيل الخروج
      </button>
    </div>
  );
}