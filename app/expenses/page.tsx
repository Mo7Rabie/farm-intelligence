"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import EditExpense from "../edit-expense";
import ExpensesTable from "../expenses-table";
import { useData, CATEGORIES, type Expense } from "../use-data";
import ImportExpenses, { type ImportRow } from "../import-expenses";
import { useLang } from "../i18n";

export default function ExpensesPage() {
  const { loading, orgId, role, farms, expenses, error, setError, load } = useData();
  const { t: tr, cat } = useLang();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);

  const canWrite = ["owner", "farm_manager", "accountant"].includes(role);
  const input = "rounded-lg border border-zinc-300 p-2 text-sm w-full min-w-0";
  const btn = "rounded-lg bg-green-800 px-4 py-2 text-sm text-white disabled:opacity-50";

  async function addExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const amount = Number(fd.get("amount"));
    if (!orgId || !Number.isFinite(amount) || amount < 0) { setError(tr("exp.err.amount")); return; }
    setError(null);
    setSaving(true);
    const { error } = await createClient().from("expenses").insert({
      organization_id: orgId,
      farm_id: String(fd.get("farm_id")),
      expense_date: String(fd.get("expense_date")),
      category: String(fd.get("category")),
      description: String(fd.get("description") ?? "").trim() || null,
      amount,
    });
    setSaving(false);
    if (error) setError(error.message); else { form.reset(); await load(); }
  }

  async function deleteExpense(id: string) {
    if (!confirm(tr("exp.confirmDelete"))) return;
    setError(null);
    const { error } = await createClient().from("expenses").delete().eq("id", id);
    if (error) setError(error.message); else await load();
  }

  async function importRows(rows: ImportRow[]): Promise<string | null> {
    const key = (r: ImportRow) => `${r.expense_date}|${r.farm_id}|${r.category}|${r.amount}`;
    const supabase = createClient();
    const { data: existing, error: fetchError } = await supabase
      .from("expenses")
      .select("expense_date, farm_id, category, amount");
    if (fetchError) return fetchError.message;
    const seen = new Set((existing ?? []).map((e) => key(e as ImportRow)));
    const fresh = rows.slice(0, 500).filter((r) => {
      const k = key(r);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (fresh.length === 0) return tr("imp.allDuplicates");
    const payload = fresh.map((r) => ({ ...r, organization_id: orgId }));
    const { error } = await supabase.from("expenses").insert(payload);
    return error ? error.message : null;
  }

  if (loading) return <p className="text-zinc-500">{tr("common.loading")}</p>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{tr("nav.expenses")}</h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {editing && <EditExpense key={editing.id} expense={editing} farms={farms} categories={CATEGORIES} onDone={async (changed) => { setEditing(null); if (changed) await load(); }} />}

      {canWrite && (
        <form onSubmit={addExpense} className="mb-6 max-w-xl rounded-xl border border-zinc-200 p-4">
          <p className="mb-3 font-medium">{tr("exp.form.title")}</p>
          {farms.length === 0 ? (
            <p className="text-sm text-zinc-500">{tr("exp.addFarmFirst")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              <select name="farm_id" required className={input}>
                {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <select name="category" required className={input}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{cat(c)}</option>)}
              </select>
              <input name="expense_date" type="date" required className={input} />
              <input name="amount" type="number" step="0.01" min="0" required placeholder={tr("exp.field.amount")} className={input} />
              <input name="description" placeholder={tr("exp.field.descriptionOptional")} className={input} />
              <button disabled={saving} className={btn}>{saving ? tr("common.saving") : tr("exp.form.submit")}</button>
            </div>
          )}
        </form>
      )}

      {canWrite && <ImportExpenses farms={farms} categories={CATEGORIES} onSave={importRows} onDone={load} />}
      <ExpensesTable expenses={expenses} farms={farms} categories={CATEGORIES} onEdit={canWrite ? setEditing : undefined} onDelete={canWrite ? deleteExpense : undefined} />
    </div>
  );
}