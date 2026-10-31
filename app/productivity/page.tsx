"use client";

import { useEffect, useState } from "react";
import { useData } from "../use-data";
import { useLang } from "../i18n";

export default function ProductivityPage() {
  const { loading, farms, expenses, error } = useData();
  const { lang, t, cat } = useLang();

  const isAr = lang === "ar";

  // الشهر الحالي بيتحسب في المتصفح بس (عشان الـ prerender ما يفشلش)
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    setNow(new Date().toISOString().slice(0, 7));
  }, []);

  if (loading || !now) {
    return (
      <p className="p-4 text-sm text-zinc-500">
        {t("productivity.loading")}
      </p>
    );
  }

  const fmt = (n: number) =>
    n.toLocaleString(isAr ? "ar-EG" : "en-US", {
      maximumFractionDigits: 2,
    });

  const sum = (arr: { amount: number }[]) =>
    arr.reduce((s, x) => s + Number(x.amount), 0);

  const month = now;
  const [y, m] = month.split("-").map(Number);

  const prev =
    m === 1
      ? `${y - 1}-12`
      : `${y}-${String(m - 1).padStart(2, "0")}`;

  const thisTotal = sum(
    expenses.filter((x) => x.expense_date.startsWith(month))
  );

  const prevTotal = sum(
    expenses.filter((x) => x.expense_date.startsWith(prev))
  );

  const change = prevTotal
    ? Math.round(((thisTotal - prevTotal) / prevTotal) * 100)
    : null;

  const monthsAll = new Set(
    expenses.map((x) => x.expense_date.slice(0, 7))
  );

  const avgMonthly = monthsAll.size
    ? sum(expenses) / monthsAll.size
    : 0;

  const catTotals: Record<string, number> = {};

  expenses.forEach((x) => {
    catTotals[x.category] =
      (catTotals[x.category] ?? 0) + Number(x.amount);
  });

  const topCat = Object.entries(catTotals).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const farmRows = farms.map((f) => {
    const list = expenses.filter((x) => x.farm_id === f.id);
    const months = new Set(
      list.map((x) => x.expense_date.slice(0, 7))
    );

    const total = sum(list);

    return {
      id: f.id,
      name: f.name,
      total,
      avg: months.size ? total / months.size : 0,
      thisMonth: sum(
        list.filter((x) => x.expense_date.startsWith(month))
      ),
    };
  });

  const max = Math.max(1, ...farmRows.map((r) => r.avg));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          {t("productivity.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {t("productivity.subtitle")}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {/* Statistics Cards */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">

        <div className="rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
          <p className="text-xs text-zinc-500">
            {t("productivity.avgMonthly")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-white">
            {fmt(avgMonthly)}
          </p>
          <span className="text-xs text-zinc-500">AED</span>
        </div>

        <div className="rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
          <p className="text-xs text-zinc-500">
            {t("productivity.monthComparison")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-white">
            {change === null
              ? "—"
              : (change > 0 ? "+" : "") + change + "%"}
          </p>
          <span className="text-xs text-zinc-500">
            {change === null
              ? t("productivity.noComparison")
              : change > 0
                ? t("productivity.increase")
                : change < 0
                  ? t("productivity.decrease")
                  : t("productivity.noChange")}
          </span>
        </div>

        <div className="rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
          <p className="text-xs text-zinc-500">
            {t("productivity.topCategory")}
          </p>
          <p className="mt-2 text-xl font-semibold text-zinc-900 dark:text-white">
            {topCat ? cat(topCat[0]) : "—"}
          </p>
        </div>

      </section>

      {/* Farm Average Chart */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">

        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-white">
          {t("productivity.farmAverage")}
        </h2>

        {farmRows.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {t("productivity.noFarms")}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {farmRows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 text-sm"
              >
                <span className="w-28 shrink-0 truncate text-zinc-500">
                  {r.name}
                </span>

                <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-3 rounded-full bg-green-700 transition-all"
                    style={{
                      width: `${Math.round((r.avg / max) * 100)}%`,
                    }}
                  />
                </div>

                <span className="w-24 text-end font-medium text-zinc-700 dark:text-zinc-300">
                  {fmt(r.avg)}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs text-zinc-400">
          AED
        </p>
      </section>

      {/* Farms Summary */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">

        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-white">
            {t("productivity.farmsSummary")}
          </h2>
        </div>

        {farmRows.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">
            {t("productivity.noData")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">

              <thead className="bg-zinc-50 dark:bg-zinc-800/70">
                <tr className="text-zinc-500">
                  <th className="px-4 py-3 text-start font-medium">
                    {t("productivity.farm")}
                  </th>
                  <th className="px-4 py-3 text-end font-medium">
                    {t("productivity.total")}
                  </th>
                  <th className="px-4 py-3 text-end font-medium">
                    {t("productivity.monthlyAverage")}
                  </th>
                  <th className="px-4 py-3 text-end font-medium">
                    {t("productivity.thisMonth")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {farmRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                      {r.name}
                    </td>
                    <td className="px-4 py-3 text-end">
                      AED {fmt(r.total)}
                    </td>
                    <td className="px-4 py-3 text-end">
                      AED {fmt(r.avg)}
                    </td>
                    <td className="px-4 py-3 text-end">
                      AED {fmt(r.thisMonth)}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
      </section>
    </div>
  );
}