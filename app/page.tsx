"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Charts from "./charts";
import { useData } from "./use-data";

const ROLES: Record<string, string> = {
  owner: "مالك", farm_manager: "مدير مزرعة", accountant: "محاسب",
  supervisor: "مشرف", analyst: "محلل", viewer: "مشاهد",
};

export default function Home() {
  const { loading, orgId, orgName, role, farms, expenses, error, setError, load, signOut } = useData();

  async function createOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (!name) return;
    setError(null);
    const { error } = await createClient().rpc("create_organization", { org_name: name });
    if (error) setError(error.message); else await load();
  }

  if (loading) return <p className="text-zinc-500">جارٍ التحميل...</p>;

  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const month = new Date().toISOString().slice(0, 7);
  const total = expenses.reduce((s, x) => s + Number(x.amount), 0);
  const monthTotal = expenses.filter((x) => x.expense_date.startsWith(month)).reduce((s, x) => s + Number(x.amount), 0);
  const farmName = (id: string) => farms.find((f) => f.id === id)?.name ?? "—";
  const input = "rounded-lg border border-zinc-300 p-2 text-sm";
  const btn = "rounded-lg bg-green-800 px-4 py-2 text-sm text-white";

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">لوحة التحكم</h1>
          <p className="text-sm text-zinc-500">{orgName}{role ? ` — ${ROLES[role] ?? role}` : ""}</p>
        </div>
        <button onClick={signOut} className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"><LogOut size={16} />تسجيل الخروج</button>
      </header>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {!orgId ? (
        <form onSubmit={createOrg} className="rounded-xl border border-zinc-200 p-6">
          <p className="mb-3 font-medium">أنشئ مؤسستك الأولى</p>
          <div className="flex gap-2">
            <input name="name" required placeholder="اسم المؤسسة" className={input + " flex-1"} />
            <button className={btn}>إنشاء</button>
          </div>
        </form>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-zinc-100 p-4">
              <p className="text-xs text-zinc-500">عدد المزارع</p>
              <p className="mt-1 text-2xl font-medium">{farms.length}</p>
            </div>
            <div className="rounded-lg bg-zinc-100 p-4">
              <p className="text-xs text-zinc-500">إجمالي المصروفات (AED)</p>
              <p className="mt-1 text-2xl font-medium">{expenses.length ? fmt(total) : "—"}</p>
            </div>
            <div className="rounded-lg bg-zinc-100 p-4">
              <p className="text-xs text-zinc-500">مصروفات هذا الشهر (AED)</p>
              <p className="mt-1 text-2xl font-medium">{fmt(monthTotal)}</p>
            </div>
            <div className="rounded-lg bg-zinc-100 p-4">
              <p className="text-xs text-zinc-500">عدد السجلات</p>
              <p className="mt-1 text-2xl font-medium">{expenses.length}</p>
            </div>
          </section>

          {expenses.length > 0 && <Charts expenses={expenses} farms={farms} />}

          <section className="mt-6 rounded-xl border border-zinc-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium">أحدث المصروفات</p>
              <Link href="/expenses" className="text-sm text-green-800 hover:underline">عرض الكل</Link>
            </div>
            {expenses.length === 0 ? (
              <p className="text-sm text-zinc-500">لا توجد مصروفات بعد</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="py-2 text-right font-medium">التاريخ</th>
                    <th className="py-2 text-right font-medium">المزرعة</th>
                    <th className="py-2 text-right font-medium">الفئة</th>
                    <th className="py-2 text-right font-medium">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, 5).map((x) => (
                    <tr key={x.id} className="border-b border-zinc-100">
                      <td className="py-2">{x.expense_date}</td>
                      <td className="py-2">{farmName(x.farm_id)}</td>
                      <td className="py-2">{x.category}</td>
                      <td className="py-2">AED {fmt(Number(x.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}