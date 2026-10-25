"use client";

import { useMemo, useState } from "react";
import { Calendar, Droplets, Leaf, Pencil, Settings, Sprout, Tag, Trash2, Wallet } from "lucide-react";

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

  const input = "rounded-lg border border-zinc-300 p-2 text-sm w-full min-w-0";
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
                              <div className="overflow-hidden rounded-xl border border-zinc-200"><table className="w-full border-collapse text-sm [&_td]:border-s [&_td]:border-zinc-200 [&_th]:border-s [&_th]:border-zinc-200 [&_td:last-child]:border-s-0 [&_th:last-child]:border-s-0">
            <thead>
                      <tr className="bg-zinc-100 text-right text-zinc-500 [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                                    <th className="py-2"><span className="inline-flex items-center gap-1.5"><Calendar size={14} />التاريخ</span></th><th><span className="inline-flex items-center gap-1.5"><Sprout size={14} />المزرعة</span></th><th><span className="inline-flex items-center gap-1.5"><Tag size={14} />الفئة</span></th><th><span className="inline-flex items-center gap-1.5"><Wallet size={14} />المبلغ</span></th><th className="text-center"><span className="inline-flex items-center gap-1.5"><Settings size={14} />إجراءات</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id} className="border-t border-zinc-100">
                                <td className="py-2.5 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><Calendar size={14} className="text-zinc-400" />{x.expense_date}</span></td>
                                <td><span className="inline-flex items-center gap-1.5"><Leaf size={14} className="text-green-700" />{farmName(x.farm_id)}</span></td>
                                
                                <td><span className="inline-flex items-center gap-1.5">{x.category === "مياه وري" ? <Droplets size={14} className="text-blue-500" /> : <Leaf size={14} className="text-green-700" />}{x.category}</span></td>
                  <td>{Number(x.amount).toLocaleString("en-US")} {x.currency}</td>
                                <td className="text-center"><div className="flex items-center justify-center gap-3">
    {onEdit && <button title="تعديل" aria-label="تعديل" onClick={() => onEdit(x)} className="rounded-md bg-green-100 p-1.5 text-green-700 hover:bg-green-200"><Pencil size={16} /></button>}
    {onDelete && <button title="حذف" aria-label="حذف" onClick={() => onDelete(x.id)} className="rounded-md bg-red-100 p-1.5 text-red-700 hover:bg-red-200"><Trash2 size={16} /></button>}
              </div></td>
                </tr>
              ))}
            </tbody>
                              </table></div>
          <p className="mt-3 text-xs text-zinc-500">{`عرض ${rows.length} من ${filtered.length} مصروفات`}</p>
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