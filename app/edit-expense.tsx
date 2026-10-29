"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "./i18n";

type Farm = { id: string; name: string };
type Expense = {
  id: string; farm_id: string; expense_date: string;
  category: string; description: string | null; amount: number; currency: string;
};

export default function EditExpense({
  expense, farms, categories, onDone,
}: {
  expense: Expense;
  farms: Farm[];
  categories: string[];
  onDone: (changed: boolean) => void;
}) {
  const { t: tr, cat } = useLang();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const input = "rounded-lg border border-zinc-300 p-2 text-sm";

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount"));
    if (!Number.isFinite(amount) || amount < 0) { setError(tr("exp.err.amount")); return; }
    setSaving(true);
    const { error } = await createClient().from("expenses").update({
      farm_id: String(fd.get("farm_id")),
      expense_date: String(fd.get("expense_date")),
      category: String(fd.get("category")),
      description: String(fd.get("description") ?? "").trim() || null,
      amount,
    }).eq("id", expense.id);
    setSaving(false);
    if (error) setError(error.message); else onDone(true);
  }

  return (
    <form onSubmit={save} className="mt-6 rounded-xl border border-green-800 p-4">
      <p className="mb-3 font-medium">{tr("exp.edit.title")}</p>
      {error && <p className="mb-2 text-sm text-red-800">{error}</p>}
      <div className="flex flex-col gap-2">
        <select name="farm_id" defaultValue={expense.farm_id} className={input}>
          {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select name="category" defaultValue={expense.category} className={input}>
          {categories.map((c) => <option key={c} value={c}>{cat(c)}</option>)}
        </select>
        <input name="expense_date" type="date" defaultValue={expense.expense_date} required className={input} />
        <input name="amount" type="number" step="0.01" min="0" defaultValue={expense.amount} required className={input} />
        <input name="description" defaultValue={expense.description ?? ""} placeholder={tr("exp.field.descriptionOptional")} className={input} />
        <div className="flex gap-2">
          <button disabled={saving} className="rounded-lg bg-green-800 px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? tr("common.saving") : tr("common.save")}
          </button>
          <button type="button" onClick={() => onDone(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">
            {tr("common.cancel")}
          </button>
        </div>
      </div>
    </form>
  );
}