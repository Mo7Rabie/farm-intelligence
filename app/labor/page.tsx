"use client";

import { useData } from "../use-data";

const CAT = "عمالة";

export default function LaborPage() {
  const { loading, farms, expenses, error } = useData();

  if (loading) return <p className="text-zinc-500">جارٍ التحميل...</p>;

  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const list = expenses.filter((x) => x.category === CAT);
  const month = new Date().toISOString().slice(0, 7);
  const total = list.reduce((s, x) => s + Number(x.amount), 0);
  const monthTotal = list.filter((x) => x.expense_date.startsWith(month)).reduce((s, x) => s + Number(x.amount), 0);
  const allTotal = expenses.reduce((s, x) => s + Number(x.amount), 0);
  const share = allTotal ? Math.round((total / allTotal) * 100) : 0;
  const farmName = (id: string) => farms.find((f) => f.id === id)?.name ?? "—";

  const byFarm = farms
    .map((f) => ({
      id: f.id,
      name: f.name,
      v: list.filter((x) => x.farm_id === f.id).reduce((s, x) => s + Number(x.amount), 0),
    }))
    .filter((r) => r.v > 0);
  const max = Math.max(1, ...byFarm.map((b) => b.v));

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">العمالة والمهام</h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-xs text-zinc-500">إجمالي تكلفة العمالة (AED)</p>
          <p className="mt-1 text-2xl font-medium">{fmt(total)}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-xs text-zinc-500">تكلفة العمالة هذا الشهر (AED)</p>
          <p className="mt-1 text-2xl font-medium">{fmt(monthTotal)}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-xs text-zinc-500">نسبة العمالة من كل المصروفات</p>
          <p className="mt-1 text-2xl font-medium">{share}%</p>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 p-4">
        <p className="mb-3 font-medium">تكلفة العمالة حسب المزرعة</p>
        {byFarm.length === 0 ? (
          <p className="text-sm text-zinc-500">لا توجد مصروفات عمالة بعد</p>
        ) : (
          <div className="flex flex-col gap-2">
            {byFarm.map((b) => (
              <div key={b.id} className="flex items-center gap-3 text-sm">
                <span className="w-32 truncate text-zinc-500">{b.name}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-3 rounded-full bg-green-700" style={{ width: Math.round((b.v / max) * 100) + "%" }} />
                </div>
                <span className="w-24 text-left">{fmt(b.v)}</span>
              </div>
            ))}
          </div>
        )}
      </section>


      <section className="mt-6 rounded-xl border border-zinc-200 p-4">
        <p className="mb-3 font-medium">سجل مصروفات العمالة</p>
        {list.length === 0 ? (
          <p className="text-sm text-zinc-500">لا توجد سجلات</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-2 text-right font-medium">التاريخ</th>
                <th className="py-2 text-right font-medium">المزرعة</th>
                <th className="py-2 text-right font-medium">الوصف</th>
                <th className="py-2 text-right font-medium">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id} className="border-b border-zinc-100">
                  <td className="py-2">{x.expense_date}</td>
                  <td className="py-2">{farmName(x.farm_id)}</td>
                  <td className="py-2">{x.description ?? "—"}</td>
                  <td className="py-2">AED {fmt(Number(x.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}