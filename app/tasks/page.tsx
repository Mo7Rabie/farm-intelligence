"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useData } from "../use-data";

type Task = {
  id: string;
  farm_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  start_date: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  completed_at: string | null;
  notes: string | null;
};
type Member = { user_id: string; email: string; role: string };

const PRIORITIES: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};
const STATUSES: Record<string, string> = {
  new: "جديدة",
  in_progress: "قيد التنفيذ",
  completed: "مكتملة",
  cancelled: "ملغاة",
};
const OPEN = ["new", "in_progress"];

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function TasksPage() {
  const { loading, orgId, role, farms, error: dataError } = useData();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fFarm, setFFarm] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const canManage = role === "owner" || role === "farm_manager";

  const loadTasks = useCallback(async () => {
    if (!orgId) return;
    const supabase = createClient();
    const { data: u } = await supabase.auth.getUser();
    setMe(u.user?.id ?? "");
    const [t, m] = await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, farm_id, title, description, assigned_to, start_date, due_date, priority, status, completed_at, notes",
        )
        .eq("organization_id", orgId)
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase.rpc("list_members", { org: orgId }),
    ]);
    if (t.error) setError(t.error.message);
    else setTasks((t.data as Task[]) ?? []);
    if (!m.error) setMembers((m.data as Member[]) ?? []);
  }, [orgId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function saveTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    if (!orgId || !canManage) return;
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      farm_id: String(fd.get("farm_id") ?? ""),
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim() || null,
      assigned_to: String(fd.get("assigned_to") ?? "") || null,
      start_date: String(fd.get("start_date") ?? "") || null,
      due_date: String(fd.get("due_date") ?? "") || null,
      priority: String(fd.get("priority") ?? "medium"),
      status: String(fd.get("status") ?? "new"),
      notes: String(fd.get("notes") ?? "").trim() || null,
    };
    if (!payload.farm_id) {
      setError("اختر المزرعة");
      return;
    }
    if (!payload.title) {
      setError("عنوان المهمة مطلوب");
      return;
    }
    if (payload.start_date && payload.due_date && payload.due_date < payload.start_date) {
      setError("تاريخ الاستحقاق لا يمكن أن يسبق تاريخ البدء");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: err } = editing
      ? await supabase.from("tasks").update(payload).eq("id", editing.id)
      : await supabase.from("tasks").insert({ ...payload, organization_id: orgId });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setShowForm(false);
    setEditing(null);
    await loadTasks();
  }

  async function changeStatus(t: Task, status: string) {
    setError(null);
    const { error: err } = await createClient()
      .from("tasks")
      .update({ status })
      .eq("id", t.id);
    if (err) setError(err.message);
    else await loadTasks();
  }

  async function deleteTask(id: string) {
    if (!confirm("هل تريد حذف هذه المهمة؟")) return;
    setError(null);
    const { error: err } = await createClient().from("tasks").delete().eq("id", id);
    if (err) setError(err.message);
    else await loadTasks();
  }

  if (loading) return <p className="text-zinc-500">جار التحميل...</p>;

  const today = todayStr();
  const isOpen = (t: Task) => OPEN.includes(t.status);
  const isOverdue = (t: Task) => isOpen(t) && !!t.due_date && t.due_date < today;
  const isDueToday = (t: Task) => isOpen(t) && t.due_date === today;
  const farmName = (id: string) => farms.find((f) => f.id === id)?.name ?? "-";
  const who = (id: string | null) =>
    id ? (members.find((m) => m.user_id === id)?.email ?? "عضو") : "-";

  const visible = tasks.filter(
    (t) =>
      (!fFarm || t.farm_id === fFarm) &&
      (!fStatus || t.status === fStatus) &&
      (!fPriority || t.priority === fPriority) &&
      (!fFrom || (t.due_date !== null && t.due_date >= fFrom)) &&
      (!fTo || (t.due_date !== null && t.due_date <= fTo)),
  );

  const total = tasks.length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const overdueCount = tasks.filter(isOverdue).length;
  const dueTodayCount = tasks.filter(isDueToday).length;

  
  const editable = (t: Task) => canManage || t.assigned_to === me;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">المهام</h1>
        {canManage && (
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white"
          >
            + مهمة جديدة
          </button>
        )}
      </div>

      {(error || dataError) && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error ?? dataError}</p>
      )}

      {(overdueCount > 0 || dueTodayCount > 0) && (
        <div className="mb-4 space-y-2">
          {overdueCount > 0 && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              تنبيه: يوجد {overdueCount} مهمة متأخرة
            </p>
          )}
          {dueTodayCount > 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              تنبيه: يوجد {dueTodayCount} مهمة مستحقة اليوم
            </p>
          )}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["إجمالي المهام", total],
          ["مكتملة", completedCount],
          ["قيد التنفيذ", inProgressCount],
          ["متأخرة", overdueCount],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-zinc-200 p-4">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {showForm && canManage && (
        <form
          key={editing?.id ?? "new"}
          onSubmit={saveTask}
          className="mb-6 grid max-w-3xl gap-3 rounded-xl border border-zinc-200 p-4 md:grid-cols-2"
        >
          <h2 className="font-medium md:col-span-2">{editing ? "تعديل مهمة" : "مهمة جديدة"}</h2>
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={editing?.title ?? ""}
            placeholder="عنوان المهمة"
            className="rounded-lg border border-zinc-300 p-2 text-sm md:col-span-2"
          />
          <textarea
            name="description"
            defaultValue={editing?.description ?? ""}
            placeholder="وصف المهمة"
            className="rounded-lg border border-zinc-300 p-2 text-sm md:col-span-2"
          />
          <select
            name="farm_id"
            required
            defaultValue={editing?.farm_id ?? ""}
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          >
            <option value="">اختر المزرعة</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            name="assigned_to"
            defaultValue={editing?.assigned_to ?? ""}
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          >
            <option value="">بدون مسؤول</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.email}
              </option>
            ))}
          </select>
          <label className="text-sm">
            تاريخ البدء
            <input
              type="date"
              name="start_date"
              defaultValue={editing?.start_date ?? ""}
              className="mt-1 block w-full rounded-lg border border-zinc-300 p-2"
            />
          </label>
          <label className="text-sm">
            تاريخ الاستحقاق
            <input
              type="date"
              name="due_date"
              defaultValue={editing?.due_date ?? ""}
              className="mt-1 block w-full rounded-lg border border-zinc-300 p-2"
            />
          </label>
          <select
            name="priority"
            defaultValue={editing?.priority ?? "medium"}
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          >
            {Object.entries(PRIORITIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={editing?.status ?? "new"}
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          >
            {Object.entries(STATUSES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <textarea
            name="notes"
            defaultValue={editing?.notes ?? ""}
            placeholder="ملاحظات"
            className="rounded-lg border border-zinc-300 p-2 text-sm md:col-span-2"
          />
          <div className="flex gap-2 md:col-span-2">
            <button
              disabled={saving}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <select
          value={fFarm}
          onChange={(e) => setFFarm(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2 text-sm"
        >
          <option value="">كل المزارع</option>
          {farms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2 text-sm"
        >
          <option value="">كل الحالات</option>
          {Object.entries(STATUSES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={fPriority}
          onChange={(e) => setFPriority(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2 text-sm"
        >
          <option value="">كل الأولويات</option>
          {Object.entries(PRIORITIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fFrom}
          onChange={(e) => setFFrom(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2 text-sm"
          aria-label="استحقاق من"
        />
        <input
          type="date"
          value={fTo}
          onChange={(e) => setFTo(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2 text-sm"
          aria-label="استحقاق إلى"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-right">
            <tr>
              <th className="p-3">المهمة</th>
              <th className="p-3">المزرعة</th>
              <th className="p-3">المسؤول</th>
              <th className="p-3">الاستحقاق</th>
              <th className="p-3">الأولوية</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr key={t.id} className="border-t border-zinc-100">
                <td className="p-3">
                  <p className="font-medium">{t.title}</p>
                  {t.description && <p className="text-xs text-zinc-500">{t.description}</p>}
                </td>
                <td className="p-3">{farmName(t.farm_id)}</td>
                <td className="p-3">{who(t.assigned_to)}</td>
                <td className="whitespace-nowrap p-3">
                  {t.due_date ?? "-"}
                  {isOverdue(t) && <span className="mr-2 text-xs text-red-700">متأخرة</span>}
                  {isDueToday(t) && <span className="mr-2 text-xs text-amber-700">اليوم</span>}
                </td>
                <td className="p-3">{PRIORITIES[t.priority] ?? t.priority}</td>
                <td className="p-3">
                  {editable(t) ? (
                    <select
                      value={t.status}
                      onChange={(e) => changeStatus(t, e.target.value)}
                      className="rounded-lg border border-zinc-300 p-1 text-sm"
                    >
                      {Object.entries(STATUSES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  ) : (
                    (STATUSES[t.status] ?? t.status)
                  )}
                </td>
                <td className="p-3">
                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditing(t);
                          setShowForm(true);
                        }}
                        className="text-green-700"
                      >
                        تعديل
                      </button>
                      <button onClick={() => deleteTask(t.id)} className="text-red-700">
                        حذف
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-zinc-500">
                  لا توجد مهام
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}