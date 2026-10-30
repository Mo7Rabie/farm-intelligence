"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import EditFarm from "../edit-farm";
import { useData, type Farm } from "../use-data";
import { useLang } from "../i18n";

export default function FarmsPage() {
  const { t } = useLang();
  const { loading, orgId, role, farms, expenses, budgets, error, setError, load } = useData();
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);

  const canWrite = ["owner", "farm_manager"].includes(role);
  const input = "rounded-lg border border-zinc-300 p-2 text-sm";
  const btn = "rounded-lg bg-green-800 px-4 py-2 text-sm text-white";

  async function addFarm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    if (!name || !orgId) return;
    setError(null);
    const { error } = await createClient().from("farms").insert({
      organization_id: orgId, name, location: String(fd.get("location") ?? "").trim() || null,
    });
    if (error) setError(error.message); else { form.reset(); await load(); }
  }

  async function deleteFarm(id: string) {
    if (!confirm(t("farms.confirmDelete"))) return;
    setError(null);
    const { error } = await createClient().from("farms").delete().eq("id", id);
    if (error) {
      setError(error.code === "23503" ? t("farms.err.hasExpenses") : error.message);
    } else await load();
  }

  async function saveBudget(farmId: string, value: string) {
    const amount = Number(value);
    if (!orgId || !Number.isFinite(amount) || amount < 0) { setError(t("farms.err.budget")); return; }
    setError(null);
    const { error } = await createClient().from("farm_budgets").upsert({ farm_id: farmId, organization_id: orgId, monthly_budget: amount, updated_at: new Date().toISOString() });
    if (error) setError(error.message); else await load();
  }

  if (loading) return <p className="text-zinc-500">{t("common.loading")}</p>;

  const month = new Date().toISOString().slice(0, 7);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{t("farms.title")}</h1>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {editingFarm && <EditFarm key={editingFarm.id} farm={editingFarm} onDone={async (changed) => { setEditingFarm(null); if (changed) await load(); }} />}

      {canWrite && (
        <form onSubmit={addFarm} className="mb-6 flex max-w-xl flex-col gap-2 rounded-xl border border-zinc-200 p-4">
          <p className="font-medium">{t("farms.add.title")}</p>
          <input name="name" required placeholder={t("farms.field.name")} className={input} />
          <input name="location" placeholder={t("farms.field.location")} className={input} />
          <button className={btn}>{t("farms.add.btn")}</button>
        </form>
      )}

      <section className="rounded-xl border border-zinc-200 p-4">
        <p className="mb-3 font-medium">{t("farms.list.title")}</p>
        {farms.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("farms.empty")}</p>
        ) : (
          <ul className="text-sm">
            {farms.map((f) => {
              const spent = expenses.filter((x) => x.farm_id === f.id && x.expense_date.startsWith(month)).reduce((s, x) => s + Number(x.amount), 0);
              const budget = budgets[f.id];
              const pct = budget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
              return (
                <li key={f.id} className="flex items-center justify-between border-t border-zinc-100 py-2 first:border-t-0">
                  <div className="flex-1">
                    <span>{f.name}{f.location ? ` — ${f.location}` : ""}</span>
                    <div className="mt-2">
                      {budget ? (
                        <>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100"><div className={"h-2 rounded-full " + (spent > budget ? "bg-red-600" : "bg-green-700")} style={{ width: pct + "%" }} /></div>
                          <p className="mt-1 text-xs text-zinc-500">{t("farms.budget.spent", { spent: spent.toLocaleString("en-US"), budget: budget.toLocaleString("en-US"), pct })}</p>
                        </>
                      ) : <p className="text-xs text-zinc-400">{t("farms.budget.none")}</p>}
                      {canWrite && <input type="number" min="0" step="0.01" placeholder={t("farms.budget.placeholder")} defaultValue={budget ?? ""} key={f.id + (budget ?? "")} onKeyDown={(ev) => { if (ev.key === "Enter") void saveBudget(f.id, (ev.target as HTMLInputElement).value); }} className="mt-2 w-56 rounded-lg border border-zinc-300 p-1.5 text-xs" />}
                    </div>
                  </div>
                  {canWrite && (
                    <span className="flex items-center gap-3">
                      <button title={t("common.edit")} aria-label={t("common.edit")} onClick={() => setEditingFarm(f)} className="rounded-md bg-green-100 p-1.5 text-green-700 hover:bg-green-200"><Pencil size={16} /></button>
                      <button title={t("common.delete")} aria-label={t("common.delete")} onClick={() => deleteFarm(f.id)} className="rounded-md bg-red-100 p-1.5 text-red-700 hover:bg-red-200"><Trash2 size={16} /></button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}