"use client";

import { useState } from "react";
import { useData, CATEGORIES } from "../use-data";

export default function ReportsPage() {
  const { loading, farms, expenses, error } = useData();
  const [farmId, setFarmId] = useState("");

  if (loading) return <p className="text-zinc-500">جارٍ التحميل...</p>;

  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const list = farmId ? expenses.filter((x) => x.farm_id === farmId) : expenses;
  const months = Array.from(new Set(list.map((x) => x.expense_date.slice(0, 7)))).sort().slice(-6);

  const cell = (cat: string, m: string) =>
    list.filter((x) => x.category === cat && x.expense_date.startsWith(m)).reduce((s, x) => s + Number(x.amount), 0);

  const rows = CATEGORIES.map((cat) => {
    const vals = months.map((m) => cell(cat, m));
    return { cat, vals, total: vals.reduce((s, v) => s + v, 0) };
  }).filter((r) => r.total > 0);

  const colTotals = months.map((_, i) => rows.reduce((s, r) => s + r.vals[i], 0));
  const grand = colTotals.reduce((s, v) => s + v, 0);

  function exportCsv() {
    const head = ["الفئة", ...months, "الإجمالي"].join(",");
    const body = rows.map((r) => [r.cat, ...r.vals, r.total].join(","));
    const foot = ["الإجمالي", ...colTotals, grand].join(",");
    const blob = new Blob(["\uFEFF" + [head, ...body, foot].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "monthly-report.csv";
    a.click();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">التقارير الشهرية</h1>
        <div className="flex gap-2">
          <select value={farmId} onChange={(e) => setFarmId(e.target.value)} className="rounded-lg border border-zinc-300 p-2 text-sm">
            <option value="">كل المزارع</option>
            {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button onClick={exportCsv} className="rounded-lg bg-green-800 px-4 py-2 text-sm text-white">تصدير CSV</button>
        </div>
      </div>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="overflow-x-auto rounded-xl border border-zinc-200 p-4">
        <p className="mb-3 font-medium">المصروفات حسب الفئة (AED) — آخر 6 شهور</p>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">لا توجد بيانات</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-2 text-right font-medium">الفئة</th>
                {months.map((m) => <th key={m} className="py-2 text-right font-medium">{m}</th>)}
                <th className="py-2 text-right font-medium">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.cat} className="border-b border-zinc-100">
                  <td className="py-2">{r.cat}</td>
                  {r.vals.map((v, i) => <td key={i} className="py-2">{v ? fmt(v) : "—"}</td>)}
                  <td className="py-2 font-medium">{fmt(r.total)}</td>
                </tr>
              ))}
              <tr className="bg-zinc-50 font-medium">
                <td className="py-2">الإجمالي</td>
                {colTotals.map((v, i) => <td key={i} className="py-2">{fmt(v)}</td>)}
                <td className="py-2">{fmt(grand)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}