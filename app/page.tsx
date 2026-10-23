"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Charts from "./charts";
import EditExpense from "./edit-expense";
import EditFarm from "./edit-farm";
import ExpensesTable from "./expenses-table";
import InviteMember from "./invite-member";
type Farm = { id: string; name: string; location: string | null };
type Expense = {
  id: string; farm_id: string; expense_date: string;
  category: string; description: string | null; amount: number; currency: string;
};
type Membership = {
  organization_id: string; role: string;
  organizations: { name: string } | { name: string }[] | null;
};

const CATEGORIES = ["عمالة", "مياه وري", "أسمدة", "شتلات", "مبيدات", "معدات", "وقود", "صيانة", "نقل", "أخرى"];

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
   const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState("");
  const [farms, setFarms] = useState<Farm[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace("/login"); return; }

    const { data: mem, error: memErr } = await supabase
      .from("organization_members")
      .select("organization_id, role, organizations(name)")
      .eq("user_id", userData.user.id)
    .limit(1);
    if (memErr) { setError(memErr.message); setLoading(false); return; }

    const m = (mem as unknown as Membership[] | null)?.[0];
    if (!m) { setOrgId(null); setLoading(false); return; }

    const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
    setOrgId(m.organization_id);
        setOrgName(org?.name ?? "");
    setRole(m.role);

    const [f, e] = await Promise.all([
      supabase.from("farms").select("id, name, location").eq("organization_id", m.organization_id).order("created_at"),
      supabase.from("expenses").select("id, farm_id, expense_date, category, description, amount, currency")
        .eq("organization_id", m.organization_id).order("expense_date", { ascending: false }),
    ]);
    if (f.error || e.error) setError((f.error ?? e.error)!.message);
    setFarms((f.data as Farm[]) ?? []);
    setExpenses((e.data as Expense[]) ?? []);
    setLoading(false);
  }, [router]);

  // تحميل البيانات عند فتح الصفحة (استخدام مشروع لمزامنة حالة خارجية)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  async function createOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (!name) return;
    setError(null);
    const { error } = await createClient().rpc("create_organization", { org_name: name });
    if (error) setError(error.message); else await load();
  }

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
async function deleteFarm(id: string) {
  if (!confirm("هل تريد حذف هذه المزرعة؟")) return;
  setError(null);
  const { error } = await createClient().from("farms").delete().eq("id", id);
  if (error) {
    setError(
      error.code === "23503"
        ? "لا يمكن حذف مزرعة عليها مصروفات. احذف مصروفاتها الأول."
        : error.message
    );
  } else await load();
}

  if (loading) return <main className="p-6 text-zinc-500">جارٍ التحميل...</main>;

  const total = expenses.reduce((s, x) => s + Number(x.amount), 0);
  const farmName = (id: string) => farms.find((f) => f.id === id)?.name ?? "—";
  const input = "rounded-lg border border-zinc-300 p-2 text-sm";
  const btn = "rounded-lg bg-green-800 px-4 py-2 text-sm text-white";
    const canWriteFarms = ["owner", "farm_manager"].includes(role);
  const canWriteExpenses = ["owner", "farm_manager", "accountant"].includes(role);
  const isOwner = role === "owner";

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">{orgName || "منصة إدارة وتحليل بيانات المزارع"}</p>
                  </div>
        <button onClick={signOut} className="text-sm text-zinc-600 underline">تسجيل الخروج</button>
      </header>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {!orgId ? (
        <form onSubmit={createOrg} className="rounded-xl border border-zinc-200 p-6">
          <p className="mb-3 font-medium">أنشئ مؤسستك الأولى</p>
          <div className="flex gap-2">
            <input name="name" required placeholder="اسم المؤسسة" className={input + " flex-1"} />
            <button className={btn}>إنشاء</button>
          </div>
        </form>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-zinc-100 p-4">
              <p className="text-xs text-zinc-500">عدد المزارع</p>
              <p className="mt-1 text-2xl font-medium">{farms.length}</p>
            </div>
            <div className="rounded-lg bg-zinc-100 p-4">
              <p className="text-xs text-zinc-500">إجمالي المصروفات (AED)</p>
              <p className="mt-1 text-2xl font-medium">
                {expenses.length ? total.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-100 p-4">
              <p className="text-xs text-zinc-500">عدد سجلات المصروفات</p>
              <p className="mt-1 text-2xl font-medium">{expenses.length}</p>
            </div>
          </section>

          {expenses.length > 0 && <Charts expenses={expenses} farms={farms} />}
          {editing && <EditExpense key={editing.id} expense={editing} farms={farms} categories={CATEGORIES} onDone={async (changed) => { setEditing(null); if (changed) await load(); }} />}
            {editingFarm && <EditFarm key={editingFarm.id} farm={editingFarm} onDone={async (changed) => { setEditingFarm(null); if (changed) await load(); }} />}

          <section className={"mt-6 grid gap-4 " + (canWriteFarms && canWriteExpenses ? "md:grid-cols-2" : "")}>
            {canWriteFarms && <form onSubmit={addFarm} className="rounded-xl border border-zinc-200 p-4">
              <p className="mb-3 font-medium">إضافة مزرعة</p>
              <div className="flex flex-col gap-2">
                <input name="name" required placeholder="اسم المزرعة" className={input} />
                <input name="location" placeholder="الموقع (اختياري)" className={input} />
                <button className={btn}>إضافة</button>
              </div>
            </form>}

            {canWriteExpenses && <form onSubmit={addExpense} className="rounded-xl border border-zinc-200 p-4">
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
            </form>}
          </section>

          <section className="mt-6 rounded-xl border border-zinc-200 p-4">
  <p className="mb-3 font-medium">المزارع</p>
  {farms.length === 0 ? (
    <p className="text-sm text-zinc-500">لا توجد مزارع بعد</p>
  ) : (
    <ul className="text-sm">
      {farms.map((f) => (
        <li key={f.id} className="flex items-center justify-between border-t border-zinc-100 py-1.5 first:border-t-0">
          <span>{f.name}{f.location ? ` — ${f.location}` : ""}</span>
{canWriteFarms && <span className="space-x-3 space-x-reverse"><button onClick={() => setEditingFarm(f)} className="text-xs text-green-800 underline">تعديل</button><button onClick={() => deleteFarm(f.id)} className="text-xs text-red-700 underline">حذف</button></span>}
</li>

      ))}
    </ul>
  )}
</section>

<ExpensesTable expenses={expenses} farms={farms} categories={CATEGORIES} onEdit={canWriteExpenses ? setEditing : undefined} onDelete={canWriteExpenses ? deleteExpense : undefined} />
{isOwner && orgId && <InviteMember orgId={orgId} />}
        </>
      )}
    </main>
  );
}
