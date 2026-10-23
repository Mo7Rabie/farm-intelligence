"use client";

import { useMemo, useState } from "react";

type Farm = { id: string; name: string };
type Expense = {
  id: string; farm_id: string; expense_date: string;
  category: string; description: string | null; amount: number; currency: string;
};

export default function ExpensesTable({
  expenses, farms, categories, onEdit, onDelete,
}: {
  expenses: Expense[];
  farms: Farm[];
  categories: string[];
    onEdit?: (x: Expense) => void;
  onDelete?: (id: string) => void;
}) {
  const [farmId, setFarmId] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showAll, setShowAll] = useState(false);

  const input = "rounded-lg border border-zinc-300 p-2 text-sm";
  const farmName = (id: string) => farms.find((f) => f.id === id)?.name ?? "—";

  const filtered = useMemo(
    () =>
      expenses.filter(
        (x) =>
          (!farmId || x.farm_id === farmId) &&
          (!category || x.category === category) &&
          (!from || x.expense_date >= from) &&
          (!to || x.expense_date <= to)
      ),
    [expenses, farmId, category, from, to]
  );

  const total = filtered.reduce((s, x) => s + Number(x.amount), 0);
  const rows = showAll ? filtered : filtered.slice(0, 10);

  function exportCsv() {
    const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["التاريخ", "المزرعة", "الفئة", "الوصف", "المبلغ", "العملة"];
    const lines = filtered.map((x) =>
      [x.expense_date, farmName(x.farm_id), x.category, x.description, x.amount, x.currency].map(esc).join(";")
    );
const csv = "\uFEFF" +  [head.map(esc).join(";"), ...lines].join("\r\n");   
 const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setFarmId(""); setCategory(""); setFrom(""); setTo("");
  }

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">المصروفات</p>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="rounded-lg bg-green-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          تصدير CSV
        </button>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <select value={farmId} onChange={(e) => setFarmId(e.target.value)} className={input}>
          <option value="">كل المزارع</option>
          {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
          <option value="">كل الفئات</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={input} title="من تاريخ" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={input} title="إلى تاريخ" />
        <button onClick={reset} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">مسح الفلاتر</button>
      </div>

      <p className="mb-2 text-xs text-zinc-500">
        {filtered.length} سجل — الإجمالي: {total.toLocaleString("en-US", { maximumFractionDigits: 2 })} AED
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">لا توجد بيانات مطابقة</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-zinc-500">
                <th className="py-1">التاريخ</th><th>المزرعة</th><th>الفئة</th><th>المبلغ</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id} className="border-t border-zinc-100">
                  <td className="py-1.5">{x.expense_date}</td>
                  <td>{farmName(x.farm_id)}</td>
                  <td>{x.category}</td>
                  <td>{Number(x.amount).toLocaleString("en-US")} {x.currency}</td>
                  <td className="space-x-3 space-x-reverse">
  {onEdit && <button onClick={() => onEdit(x)} className="text-xs text-green-800 underline">تعديل</button>}
  {onDelete && <button onClick={() => onDelete(x.id)} className="text-xs text-red-700 underline">حذف</button>}
</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 10 && (
            <button onClick={() => setShowAll(!showAll)} className="mt-3 text-sm text-green-800 underline">
              {showAll ? "عرض أقل" : `عرض الكل (${filtered.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}