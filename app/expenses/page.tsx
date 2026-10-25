"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import EditExpense from "../edit-expense";
import ExpensesTable from "../expenses-table";
import { useData, CATEGORIES, type Expense } from "../use-data";

export default function ExpensesPage() {
  const { loading, orgId, role, farms, expenses, error, setError, load } = useData();
  const [editing, setEditing] = useState<Expense | null>(null);

  const canWrite = ["owner", "farm_manager", "accountant"].includes(role);
 const input = "rounded-lg border border-zinc-300 p-2 text-sm w-full min-w-0";
  const btn = "rounded-lg bg-green-800 px-4 py-2 text-sm text-white";

  async function addExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const amount = Number(fd.get("amount"));
    if (!orgId || !Number.isFinite(amount) || amount < 0) { setError("المبلغ غير صحيح"); return; }
    setError(null);
    const { error } = await createClient().from("expenses").insert({
      organization_id: orgId,
      farm_id: String(fd.get("farm_id")),
      expense_date: String(fd.get("expense_date")),
      category: String(fd.get("category")),
      description: String(fd.get("description") ?? "").trim() || null,
      amount,
    });
    if (error) setError(error.message); else { form.reset(); await load(); }
  }

  async function deleteExpense(id: string) {
    if (!confirm("هل تريد حذف هذا المصروف؟")) return;
    setError(null);
    const { error } = await createClient().from("expenses").delete().eq("id", id);
    if (error) setError(error.message); else await load();
  }

  if (loading) return <p className="text-zinc-500">جارٍ التحميل...</p>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">المصروفات</h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {editing && <EditExpense key={editing.id} expense={editing} farms={farms} categories={CATEGORIES} onDone={async (changed) => { setEditing(null); if (changed) await load(); }} />}

      {canWrite && (
        <form onSubmit={addExpense} className="mb-6 max-w-xl rounded-xl border border-zinc-200 p-4">
          <p className="mb-3 font-medium">تسجيل مصروف</p>
          {farms.length === 0 ? (
            <p className="text-sm text-zinc-500">أضف مزرعة أولًا.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <select name="farm_id" required className={input}>
                {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <select name="category" required className={input}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input name="expense_date" type="date" required className={input} />
              <input name="amount" type="number" step="0.01" min="0" required placeholder="المبلغ (AED)" className={input} />
              <input name="description" placeholder="وصف (اختياري)" className={input} />
              <button className={btn}>تسجيل</button>
            </div>
          )}
        </form>
      )}

      <ExpensesTable expenses={expenses} farms={farms} categories={CATEGORIES} onEdit={canWrite ? setEditing : undefined} onDelete={canWrite ? deleteExpense : undefined} />
    </div>
  );
}