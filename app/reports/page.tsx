"use client";

import { useState } from "react";
import { useData, CATEGORIES } from "../use-data";
import { useLang } from "../i18n";

export default function ReportsPage() {
  const { loading, farms, expenses, error } = useData();
  const { lang, t, cat } = useLang();

  const [farmId, setFarmId] = useState("");

  const isAr = lang === "ar";

  const formatNumber = (n: number) =>
    n.toLocaleString(isAr ? "ar-EG" : "en-US", {
      maximumFractionDigits: 2,
    });

  const list = farmId
    ? expenses.filter((x) => x.farm_id === farmId)
    : expenses;

  // آخر 6 شهور تحتوي على بيانات
  const months = Array.from(
    new Set(list.map((x) => x.expense_date.slice(0, 7)))
  )
    .sort()
    .slice(-6);

  const monthLabel = (month: string) =>
    new Date(`${month}-01T12:00:00`).toLocaleDateString(
      isAr ? "ar-EG" : "en-US",
      {
        month: "short",
        year: "numeric",
      }
    );

  const cell = (category: string, month: string) =>
    list
      .filter(
        (x) =>
          x.category === category &&
          x.expense_date.startsWith(month)
      )
      .reduce((sum, x) => sum + Number(x.amount), 0);

  const rows = CATEGORIES.map((category) => {
    const values = months.map((month) => cell(category, month));

    return {
      category,
      values,
      total: values.reduce((sum, value) => sum + value, 0),
    };
  }).filter((row) => row.total > 0);

  const columnTotals = months.map((_, index) =>
    rows.reduce((sum, row) => sum + row.values[index], 0)
  );

  const grandTotal = columnTotals.reduce(
    (sum, value) => sum + value,
    0
  );

  function exportCsv() {
    const escapeCsv = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const header = [
      t("reports.category"),
      ...months.map(monthLabel),
      t("reports.total"),
    ]
      .map(escapeCsv)
      .join(",");

    const body = rows.map((row) =>
      [
        cat(row.category),
        ...row.values,
        row.total,
      ]
        .map(escapeCsv)
        .join(",")
    );

    const footer = [
      t("reports.total"),
      ...columnTotals,
      grandTotal,
    ]
      .map(escapeCsv)
      .join(",");

    const csv = [header, ...body, footer].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "monthly-report.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-zinc-500">
        {isAr ? "جارٍ التحميل..." : "Loading..."}
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {isAr ? "حدث خطأ أثناء تحميل البيانات." : "Error loading data."}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {t("reports.title")}
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            {t("reports.expensesByCategory")}
          </p>
        </div>

        <button
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ↓ {t("reports.exportCsv")}
        </button>
      </div>

      {/* Farm Filter */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {isAr ? "المزرعة" : "Farm"}
        </label>

        <select
          value={farmId}
          onChange={(e) => setFarmId(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 sm:max-w-xs"
        >
          <option value="">
            {t("reports.farm.all")}
          </option>

          {farms.map((farm) => (
            <option key={farm.id} value={farm.id}>
              {farm.name}
            </option>
          ))}
        </select>
      </div>

      {/* Total Card */}
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          {t("reports.total")}
        </p>

        <p className="mt-2 text-3xl font-bold text-emerald-800 dark:text-emerald-300">
          {formatNumber(grandTotal)}
          <span className="ms-2 text-sm font-normal">AED</span>
        </p>
      </div>

      {/* Report Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">

        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-white">
            {t("reports.expensesByCategory")}
          </h2>
        </div>

        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">
            {t("reports.noData")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/70">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold text-zinc-600 dark:text-zinc-300">
                    {t("reports.category")}
                  </th>

                  {months.map((month) => (
                    <th
                      key={month}
                      className="px-4 py-3 text-end font-semibold text-zinc-600 dark:text-zinc-300"
                    >
                      {monthLabel(month)}
                    </th>
                  ))}

                  <th className="px-4 py-3 text-end font-semibold text-zinc-600 dark:text-zinc-300">
                    {t("reports.total")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.category}
                    className="border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                      {cat(row.category)}
                    </td>

                    {row.values.map((value, index) => (
                      <td
                        key={index}
                        className="px-4 py-3 text-end text-zinc-600 dark:text-zinc-400"
                      >
                        {value > 0 ? formatNumber(value) : "—"}
                      </td>
                    ))}

                    <td className="px-4 py-3 text-end font-semibold text-zinc-900 dark:text-white">
                      {formatNumber(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot className="border-t-2 border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/70">
                <tr>
                  <td className="px-4 py-3 font-bold text-zinc-900 dark:text-white">
                    {t("reports.total")}
                  </td>

                  {columnTotals.map((value, index) => (
                    <td
                      key={index}
                      className="px-4 py-3 text-end font-bold text-zinc-900 dark:text-white"
                    >
                      {formatNumber(value)}
                    </td>
                  ))}

                  <td className="px-4 py-3 text-end font-bold text-emerald-700 dark:text-emerald-400">
                    {formatNumber(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}