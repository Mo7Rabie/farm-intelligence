"use client";

import { useState } from "react";
import Papa from "papaparse";
import { readSheet } from "read-excel-file/browser";
import { useLang, type Key, type TFn } from "./i18n";

export type Farm = { id: string; name: string };
export type ImportRow = {
  farm_id: string;
  expense_date: string;
  category: string;
  description: string | null;
  amount: number;
};
type Checked = { line: number; row?: ImportRow; errors: string[] };

const MAX_ROWS = 500;
const MAX_SIZE = 2 * 1024 * 1024;
const HEAD: Record<string, string> = {
  "التاريخ": "date", date: "date",
  "المزرعة": "farm", farm: "farm",
  "الفئة": "category", category: "category",
  "الوصف": "description", description: "description",
  "المبلغ": "amount", amount: "amount",
};
const LABEL: Record<string, Key> = {
  date: "exp.col.date", farm: "exp.col.farm", category: "exp.col.category", amount: "exp.col.amount",
};

async function readRows(file: File, tr: TFn): Promise<unknown[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) return await readSheet(file);
  if (name.endsWith(".csv")) {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    return Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
  }
  throw new Error(tr("imp.err.type"));
}

function validate(
  rows: unknown[][],
  farms: Farm[],
  categories: string[],
  tr: TFn,
  catKey: (name: string) => string,
): Checked[] {
  if (rows.length < 2) throw new Error(tr("imp.err.empty"));
  if (rows.length - 1 > MAX_ROWS) throw new Error(tr("imp.err.maxRows", { n: MAX_ROWS }));
  const head = rows[0].map((h) => HEAD[String(h ?? "").trim().toLowerCase()] ?? "");
  const missing = ["date", "farm", "category", "amount"].filter((k) => !head.includes(k));
  if (missing.length) {
    throw new Error(
      tr("imp.err.missingCols", { cols: missing.map((k) => tr(LABEL[k])).join(tr("common.listSep")) }),
    );
  }

  const out: Checked[] = [];
  rows.slice(1).forEach((r, i) => {
    if (!r.some((c) => String(c ?? "").trim() !== "")) return;
    const get = (k: string) => r[head.indexOf(k)];
    const errors: string[] = [];

    const rawDate = get("date");
    const date = rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) errors.push(tr("imp.err.date"));

    const farmName = String(get("farm") ?? "").trim().toLowerCase();
    const farm = farms.find((f) => f.name.trim().toLowerCase() === farmName);
    if (!farm) errors.push(tr("imp.err.farm"));

    // Accepts Arabic or English category names; always stores the Arabic value.
    const category = catKey(String(get("category") ?? "").trim());
    if (!categories.includes(category)) errors.push(tr("imp.err.category"));

    const rawAmount = String(get("amount") ?? "").replace(/,/g, "").trim();
    const amount = rawAmount === "" ? NaN : Number(rawAmount);
    if (!Number.isFinite(amount) || amount < 0) errors.push(tr("imp.err.amount"));

    const desc = String(get("description") ?? "").trim().slice(0, 200);
    out.push({
      line: i + 2,
      errors,
      row: errors.length ? undefined : { farm_id: farm!.id, expense_date: date, category, description: desc || null, amount },
    });
  });
  if (out.length === 0) throw new Error(tr("imp.err.noRows"));
  return out;
}

export default function ImportExpenses({
  farms,
  categories,
  onSave,
  onDone,
}: {
  farms: Farm[];
  categories: string[];
  onSave: (rows: ImportRow[]) => Promise<string | null>;
  onDone: () => void;
}) {
  const { t: tr, cat, catKey } = useLang();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Checked[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<{ ok: number; failed: number } | null>(null);

  const good = checked.filter((c) => c.row).map((c) => c.row as ImportRow);
  const bad = checked.length - good.length;

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setChecked([]);
    setSummary(null);
    setError(null);
    if (!file) return;
    if (file.size > MAX_SIZE) {
      setError(tr("imp.err.size"));
      return;
    }
    try {
      setChecked(validate(await readRows(file, tr), farms, categories, tr, catKey));
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("imp.err.read"));
    }
  }

  async function save() {
    if (good.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    const msg = await onSave(good);
    setBusy(false);
    if (msg) {
      setError(msg);
      return;
    }
    setSummary({ ok: good.length, failed: bad });
    setChecked([]);
    onDone();
  }

  return (
    <div className="mb-6 max-w-xl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-lg border border-green-800 px-4 py-2 text-sm text-green-800"
      >
        {open ? tr("imp.close") : tr("imp.open")}
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-zinc-200 p-4">
          <p className="mb-2 text-sm text-zinc-500">{tr("imp.hint", { n: MAX_ROWS })}</p>
          <input type="file" accept=".csv,.xlsx" onChange={pick} className="mb-3 block text-sm" />
          {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {summary && (
            <p className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              {tr("imp.summary", { ok: summary.ok, failed: summary.failed })}
            </p>
          )}
          {checked.length > 0 && (
            <div>
              <p className="mb-2 text-sm">
                {tr("imp.validLabel")}: <b>{good.length}</b> — {tr("imp.invalidLabel")}: <b>{bad}</b>
              </p>
              {bad > 0 && (
                <ul className="mb-3 max-h-40 overflow-auto rounded-lg bg-red-50 p-3 text-xs text-red-800">
                  {checked
                    .filter((c) => !c.row)
                    .map((c) => (
                      <li key={c.line}>
                        {tr("imp.line", { n: c.line, errs: c.errors.join(tr("common.listSep")) })}
                      </li>
                    ))}
                </ul>
              )}
              {good.length > 0 && (
                <div className="mb-3 max-h-60 overflow-auto rounded-lg border border-zinc-200">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-100">
                      <tr>
                        <th className="p-2">{tr("exp.col.date")}</th>
                        <th className="p-2">{tr("exp.col.farm")}</th>
                        <th className="p-2">{tr("exp.col.category")}</th>
                        <th className="p-2">{tr("exp.col.amount")}</th>
                        <th className="p-2">{tr("exp.col.description")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {good.map((r, i) => (
                        <tr key={i} className="border-t border-zinc-100">
                          <td className="whitespace-nowrap p-2">{r.expense_date}</td>
                          <td className="p-2">{farms.find((f) => f.id === r.farm_id)?.name}</td>
                          <td className="p-2">{cat(r.category)}</td>
                          <td className="p-2">{r.amount}</td>
                          <td className="p-2">{r.description ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button
                type="button"
                onClick={save}
                disabled={busy || good.length === 0}
                className="rounded-lg bg-green-800 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy ? tr("common.saving") : tr("imp.import", { n: good.length })}
              </button>
              {bad > 0 && <p className="mt-2 text-xs text-zinc-500">{tr("imp.skipNote")}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}