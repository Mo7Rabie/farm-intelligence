"use client";

import { useEffect, useState } from "react";
import { useData } from "../use-data";

export default function BudgetPage() {
  const { loading, farms, expenses, budgets, error } = useData();
 const [month, setMonth] = useState("");
useEffect(() => { setMonth(new Date().toISOString().slice(0, 7)); }, []);
  if (loading) return <p className="text-zinc-500">جارٍ التحميل...</p>;

  const rows = farms.map((f) => {
    const spent = expenses.filter((x) => x.farm_id === f.id && x.expense_date.startsWith(month)).reduce((s, x) => s + Number(x.amount), 0);
    const budget = budgets[f.id] ?? 0;
    return { id: f.id, name: f.name, budget, spent, left: budget - spent };
  });
  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">إعداد الميزانية</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-zinc-300 p-2 text-sm" />
      </div>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-xs text-zinc-500">الميزانية المعتمدة</p>
          <p className="mt-1 text-2xl font-medium">AED {fmt(totalBudget)}</p>
        </div>
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-xs text-zinc-500">المصروفات الفعلية</p>
          <p className="mt-1 text-2xl font-medium">AED {fmt(totalSpent)}</p>
        </div>
        <div className={"rounded-lg p-4 " + (totalBudget - totalSpent < 0 ? "bg-red-50" : "bg-green-50")}>
          <p className="text-xs text-zinc-500">المتبقي</p>
          <p className="mt-1 text-2xl font-medium">AED {fmt(totalBudget - totalSpent)}</p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 p-4">
        <p className="mb-3 font-medium">تفاصيل الميزانية</p>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">لا توجد مزارع بعد</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-2 text-right font-medium">المزرعة</th>
                <th className="py-2 text-right font-medium">الميزانية</th>
                <th className="py-2 text-right font-medium">المصروف</th>
                <th className="py-2 text-right font-medium">المتبقي</th>
                <th className="py-2 text-right font-medium">النسبة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = r.budget ? Math.round((r.spent / r.budget) * 100) : 0;
                return (
                  <tr key={r.id} className="border-b border-zinc-100">
                    <td className="py-2">{r.name}</td>
                    <td className="py-2">{r.budget ? fmt(r.budget) : "—"}</td>
                    <td className="py-2">{fmt(r.spent)}</td>
                    <td className={"py-2 " + (r.left < 0 ? "text-red-700" : "")}>{r.budget ? fmt(r.left) : "—"}</td>
                    <td className="py-2">
                      {r.budget ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100"><div className={"h-2 rounded-full " + (r.spent > r.budget ? "bg-red-600" : "bg-green-700")} style={{ width: Math.min(100, pct) + "%" }} /></div>
                          <span className="text-xs">{pct}%</span>
                        </div>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-zinc-400">لتعديل الميزانية الشهرية لكل مزرعة: صفحة المزارع.</p>
      </section>
    </div>
  );
}