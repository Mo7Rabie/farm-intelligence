"use client";

import { useData } from "../use-data";

export default function ProductivityPage() {
  const { loading, farms, expenses, error } = useData();

  if (loading) return <p className="text-zinc-500">جارٍ التحميل...</p>;

  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const sum = (arr: { amount: number }[]) => arr.reduce((s, x) => s + Number(x.amount), 0);

  const month = new Date().toISOString().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;

  const thisTotal = sum(expenses.filter((x) => x.expense_date.startsWith(month)));
  const prevTotal = sum(expenses.filter((x) => x.expense_date.startsWith(prev)));
  const change = prevTotal ? Math.round(((thisTotal - prevTotal) / prevTotal) * 100) : null;

  const monthsAll = new Set(expenses.map((x) => x.expense_date.slice(0, 7)));
  const avgMonthly = monthsAll.size ? sum(expenses) / monthsAll.size : 0;

  const catTotals: Record<string, number> = {};
  expenses.forEach((x) => { catTotals[x.category] = (catTotals[x.category] ?? 0) + Number(x.amount); });
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

  const farmRows = farms.map((f) => {
    const list = expenses.filter((x) => x.farm_id === f.id);
    const months = new Set(list.map((x) => x.expense_date.slice(0, 7)));
    const total = sum(list);
    return {
      id: f.id,
      name: f.name,
      total,
      avg: months.size ? total / months.size : 0,
      thisMonth: sum(list.filter((x) => x.expense_date.startsWith(month))),
    };
  });
  const max = Math.max(1, ...farmRows.map((r) => r.avg));

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">الإنتاجية</h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-xs text-zinc-500">متوسط المصروف الشهري (AED)</p>
          <p className="mt-1 text-2xl font-medium">{fmt(avgMonthly)}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-xs text-zinc-500">مقارنة هذا الشهر بالشهر السابق</p>
          <p className="mt-1 text-2xl font-medium">{change === null ? "—" : (change > 0 ? "+" : "") + change + "%"}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-xs text-zinc-500">أكبر فئة مصروفات</p>
          <p className="mt-1 text-2xl font-medium">{topCat ? topCat[0] : "—"}</p>
        </div>
      </section>

      
      <section className="mt-6 rounded-xl border border-zinc-200 p-4">
        <p className="mb-3 font-medium">متوسط المصروف الشهري لكل مزرعة (AED)</p>
        {farmRows.length === 0 ? (
          <p className="text-sm text-zinc-500">لا توجد مزارع بعد</p>
        ) : (
          <div className="flex flex-col gap-2">
            {farmRows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 text-sm">
                <span className="w-32 truncate text-zinc-500">{r.name}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-3 rounded-full bg-green-700" style={{ width: Math.round((r.avg / max) * 100) + "%" }} />
                </div>
                <span className="w-24 text-left">{fmt(r.avg)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 p-4">
        <p className="mb-3 font-medium">ملخص المزارع</p>
        {farmRows.length === 0 ? (
          <p className="text-sm text-zinc-500">لا توجد بيانات</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-2 text-right font-medium">المزرعة</th>
                <th className="py-2 text-right font-medium">الإجمالي</th>
                <th className="py-2 text-right font-medium">المتوسط الشهري</th>
                <th className="py-2 text-right font-medium">هذا الشهر</th>
              </tr>
            </thead>
            <tbody>
              {farmRows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100">
                  <td className="py-2">{r.name}</td>
                  <td className="py-2">AED {fmt(r.total)}</td>
                  <td className="py-2">AED {fmt(r.avg)}</td>
                  <td className="py-2">AED {fmt(r.thisMonth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}