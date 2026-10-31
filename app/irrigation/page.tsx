"use client";

import { useData } from "../use-data";
import { useLang } from "../i18n";

const CAT = "مياه وري";

export default function IrrigationPage() {
  const { t } = useLang();
  const { loading, farms, expenses, error } = useData();

  if (loading) return <p className="text-zinc-500">{t("common.loading")}</p>;

  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const list = expenses.filter((x) => x.category === CAT);
  const month = new Date().toISOString().slice(0, 7);
  const total = list.reduce((s, x) => s + Number(x.amount), 0);
  const monthTotal = list.filter((x) => x.expense_date.startsWith(month)).reduce((s, x) => s + Number(x.amount), 0);
  const months = Array.from(new Set(list.map((x) => x.expense_date.slice(0, 7)))).sort().slice(-6);
  const byMonth = months.map((m) => ({
    m,
    v: list.filter((x) => x.expense_date.startsWith(m)).reduce((s, x) => s + Number(x.amount), 0),
  }));
  const max = Math.max(1, ...byMonth.map((b) => b.v));
  const avg = months.length ? total / months.length : 0;
  const farmName = (id: string) => farms.find((f) => f.id === id)?.name ?? "—";

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{t("irr.title")}</h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-xs text-zinc-500">{t("irr.stat.total")}</p>
          <p className="mt-1 text-2xl font-medium">{fmt(total)}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-xs text-zinc-500">{t("irr.stat.month")}</p>
          <p className="mt-1 text-2xl font-medium">{fmt(monthTotal)}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-xs text-zinc-500">{t("irr.stat.avg")}</p>
          <p className="mt-1 text-2xl font-medium">{fmt(avg)}</p>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 p-4">
        <p className="mb-3 font-medium">{t("irr.monthly")}</p>
        {byMonth.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("irr.noExpenses")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {byMonth.map((b) => (
              <div key={b.m} className="flex items-center gap-3 text-sm">
                <span className="w-20 text-zinc-500">{b.m}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-3 rounded-full bg-blue-600" style={{ width: Math.round((b.v / max) * 100) + "%" }} />
                </div>
                <span className="w-24 text-start">{fmt(b.v)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 p-4">
        <p className="mb-3 font-medium">{t("irr.log")}</p>
        {list.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("irr.noRecords")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-2 text-start font-medium">{t("exp.col.date")}</th>
                <th className="py-2 text-start font-medium">{t("exp.col.farm")}</th>
                <th className="py-2 text-start font-medium">{t("exp.col.description")}</th>
                <th className="py-2 text-start font-medium">{t("exp.col.amount")}</th>
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