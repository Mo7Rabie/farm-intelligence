"use client";

import { useState } from "react";
import Papa from "papaparse";
import { readSheet } from "read-excel-file/browser";

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
const LABEL: Record<string, string> = {
  date: "التاريخ", farm: "المزرعة", category: "الفئة", amount: "المبلغ",
};

async function readRows(file: File): Promise<unknown[][]> {
  const name = file.name.toLowerCase();
 if (name.endsWith(".xlsx")) return await readSheet(file);
  if (name.endsWith(".csv")) {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    return Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
  }
  throw new Error("الملف لازم يكون CSV أو XLSX");
}

function validate(rows: unknown[][], farms: Farm[], categories: string[]): Checked[] {
  if (rows.length < 2) throw new Error("الملف فاضي");
  if (rows.length - 1 > MAX_ROWS) throw new Error(`الحد الأقصى ${MAX_ROWS} صف`);
  const head = rows[0].map((h) => HEAD[String(h ?? "").trim().toLowerCase()] ?? "");
  const missing = ["date", "farm", "category", "amount"].filter((k) => !head.includes(k));
  if (missing.length) throw new Error("أعمدة ناقصة: " + missing.map((k) => LABEL[k]).join("، "));

  const out: Checked[] = [];
  rows.slice(1).forEach((r, i) => {
    if (!r.some((c) => String(c ?? "").trim() !== "")) return;
    const get = (k: string) => r[head.indexOf(k)];
    const errors: string[] = [];

    const rawDate = get("date");
    const date = rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) errors.push("تاريخ غير صحيح (الصيغة YYYY-MM-DD)");

    const farmName = String(get("farm") ?? "").trim().toLowerCase();
    const farm = farms.find((f) => f.name.trim().toLowerCase() === farmName);
    if (!farm) errors.push("المزرعة غير موجودة");

    const category = String(get("category") ?? "").trim();
    if (!categories.includes(category)) errors.push("فئة غير معروفة");

    const rawAmount = String(get("amount") ?? "").replace(/,/g, "").trim();
    const amount = rawAmount === "" ? NaN : Number(rawAmount);
    if (!Number.isFinite(amount) || amount < 0) errors.push("مبلغ غير صحيح");

    const desc = String(get("description") ?? "").trim().slice(0, 200);
    out.push({
      line: i + 2,
      errors,
      row: errors.length ? undefined : { farm_id: farm!.id, expense_date: date, category, description: desc || null, amount },
    });
  });
  if (out.length === 0) throw new Error("مفيش صفوف بيانات");
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
      setError("الملف أكبر من 2MB");
      return;
    }
    try {
      setChecked(validate(await readRows(file), farms, categories));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر قراءة الملف");
    }
  }

  async function save() {
    if (good.length === 0) return;
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
        {open ? "إغلاق الاستيراد" : "استيراد من CSV / Excel"}
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-zinc-200 p-4">
          <p className="mb-2 text-sm text-zinc-500">
            الأعمدة المطلوبة: التاريخ (YYYY-MM-DD)، المزرعة، الفئة، المبلغ. والوصف اختياري. الحد الأقصى {MAX_ROWS} صف.
          </p>
          <input type="file" accept=".csv,.xlsx" onChange={pick} className="mb-3 block text-sm" />
          {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {summary && (
            <p className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              تم استيراد {summary.ok} صف بنجاح، وتم تخطي {summary.failed} صف بها أخطاء.
            </p>
          )}
          {checked.length > 0 && (
            <div>
              <p className="mb-2 text-sm">
                صفوف صالحة: <b>{good.length}</b> — صفوف بها أخطاء: <b>{bad}</b>
              </p>
              {bad > 0 && (
                <ul className="mb-3 max-h-40 overflow-auto rounded-lg bg-red-50 p-3 text-xs text-red-800">
                  {checked
                    .filter((c) => !c.row)
                    .map((c) => (
                      <li key={c.line}>
                        سطر {c.line}: {c.errors.join("، ")}
                      </li>
                    ))}
                </ul>
              )}
              {good.length > 0 && (
                <div className="mb-3 max-h-60 overflow-auto rounded-lg border border-zinc-200">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-100">
                      <tr>
                        <th className="p-2">التاريخ</th>
                        <th className="p-2">المزرعة</th>
                        <th className="p-2">الفئة</th>
                        <th className="p-2">المبلغ</th>
                        <th className="p-2">الوصف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {good.map((r, i) => (
                        <tr key={i} className="border-t border-zinc-100">
                          <td className="whitespace-nowrap p-2">{r.expense_date}</td>
                          <td className="p-2">{farms.find((f) => f.id === r.farm_id)?.name}</td>
                          <td className="p-2">{r.category}</td>
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
                {busy ? "جارٍ الحفظ..." : `استيراد ${good.length} صف صالح`}
              </button>
              {bad > 0 && <p className="mt-2 text-xs text-zinc-500">الصفوف التي بها أخطاء لن يتم استيرادها.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}