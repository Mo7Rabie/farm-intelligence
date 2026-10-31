"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useData } from "../use-data";
import { useLang, type Key } from "../i18n";

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

const PRIORITY_CODES = ["low", "medium", "high", "urgent"];
const STATUS_CODES = ["new", "in_progress", "completed", "cancelled"];
const OPEN = ["new", "in_progress"];

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function TasksPage() {
  const { loading, orgId, role, farms, error: dataError } = useData();
  const { t: tr } = useLang();
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
      setError(tr("tasks.field.chooseFarm"));
      return;
    }
    if (!payload.title) {
      setError(tr("tasks.err.title"));
      return;
    }
    if (payload.start_date && payload.due_date && payload.due_date < payload.start_date) {
      setError(tr("tasks.err.dates"));
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
    if (!confirm(tr("tasks.confirmDelete"))) return;
    setError(null);
    const { error: err } = await createClient().from("tasks").delete().eq("id", id);
    if (err) setError(err.message);
    else await loadTasks();
  }

  if (loading) return <p className="text-zinc-500">{tr("common.loading")}</p>;

  const today = todayStr();
  const isOpen = (t: Task) => OPEN.includes(t.status);
  const isOverdue = (t: Task) => isOpen(t) && !!t.due_date && t.due_date < today;
  const isDueToday = (t: Task) => isOpen(t) && t.due_date === today;
  const farmName = (id: string) => farms.find((f) => f.id === id)?.name ?? "-";
  const who = (id: string | null) =>
    id ? (members.find((m) => m.user_id === id)?.email ?? tr("tasks.member")) : "-";
  const prioLabel = (p: string) => tr(`tasks.prio.${p}` as Key);
  const statusLabel = (s: string) => tr(`tasks.status.${s}` as Key);

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
        <h1 className="text-xl font-bold">{tr("nav.tasks")}</h1>
        {canManage && (
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white"
          >
            {tr("tasks.new")}
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
              {tr("tasks.alert.overdue", { n: overdueCount })}
            </p>
          )}
          {dueTodayCount > 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              {tr("tasks.alert.dueToday", { n: dueTodayCount })}
            </p>
          )}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [tr("tasks.stat.total"), total],
          [tr("tasks.stat.completed"), completedCount],
          [tr("tasks.stat.inProgress"), inProgressCount],
          [tr("tasks.stat.overdue"), overdueCount],
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
          <h2 className="font-medium md:col-span-2">
            {editing ? tr("tasks.form.edit") : tr("tasks.form.new")}
          </h2>
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={editing?.title ?? ""}
            placeholder={tr("tasks.field.title")}
            className="rounded-lg border border-zinc-300 p-2 text-sm md:col-span-2"
          />
          <textarea
            name="description"
            defaultValue={editing?.description ?? ""}
            placeholder={tr("tasks.field.description")}
            className="rounded-lg border border-zinc-300 p-2 text-sm md:col-span-2"
          />
          <select
            name="farm_id"
            required
            defaultValue={editing?.farm_id ?? ""}
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          >
            <option value="">{tr("tasks.field.chooseFarm")}</option>
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
            <option value="">{tr("tasks.field.noAssignee")}</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.email}
              </option>
            ))}
          </select>
          <label className="text-sm">
            {tr("tasks.field.startDate")}
            <input
              type="date"
              name="start_date"
              defaultValue={editing?.start_date ?? ""}
              className="mt-1 block w-full rounded-lg border border-zinc-300 p-2"
            />
          </label>
          <label className="text-sm">
            {tr("tasks.field.dueDate")}
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
            {PRIORITY_CODES.map((k) => (
              <option key={k} value={k}>
                {prioLabel(k)}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={editing?.status ?? "new"}
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          >
            {STATUS_CODES.map((k) => (
              <option key={k} value={k}>
                {statusLabel(k)}
              </option>
            ))}
          </select>
          <textarea
            name="notes"
            defaultValue={editing?.notes ?? ""}
            placeholder={tr("tasks.field.notes")}
            className="rounded-lg border border-zinc-300 p-2 text-sm md:col-span-2"
          />
          <div className="flex gap-2 md:col-span-2">
            <button
              disabled={saving}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? tr("common.saving") : tr("common.save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
            >
              {tr("common.cancel")}
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
          <option value="">{tr("tasks.filter.allFarms")}</option>
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
          <option value="">{tr("tasks.filter.allStatuses")}</option>
          {STATUS_CODES.map((k) => (
            <option key={k} value={k}>
              {statusLabel(k)}
            </option>
          ))}
        </select>
        <select
          value={fPriority}
          onChange={(e) => setFPriority(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2 text-sm"
        >
          <option value="">{tr("tasks.filter.allPriorities")}</option>
          {PRIORITY_CODES.map((k) => (
            <option key={k} value={k}>
              {prioLabel(k)}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fFrom}
          onChange={(e) => setFFrom(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2 text-sm"
          aria-label={tr("tasks.filter.dueFrom")}
        />
        <input
          type="date"
          value={fTo}
          onChange={(e) => setFTo(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2 text-sm"
          aria-label={tr("tasks.filter.dueTo")}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-start">
            <tr>
              <th className="p-3">{tr("tasks.col.task")}</th>
              <th className="p-3">{tr("tasks.col.farm")}</th>
              <th className="p-3">{tr("tasks.col.assignee")}</th>
              <th className="p-3">{tr("tasks.col.due")}</th>
              <th className="p-3">{tr("tasks.col.priority")}</th>
              <th className="p-3">{tr("tasks.col.status")}</th>
              <th className="p-3">{tr("common.actions")}</th>
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
                  {isOverdue(t) && (
                    <span className="ms-2 text-xs text-red-700">{tr("tasks.stat.overdue")}</span>
                  )}
                  {isDueToday(t) && (
                    <span className="ms-2 text-xs text-amber-700">{tr("tasks.badge.today")}</span>
                  )}
                </td>
                <td className="p-3">{prioLabel(t.priority)}</td>
                <td className="p-3">
                  {editable(t) ? (
                    <select
                      value={t.status}
                      onChange={(e) => changeStatus(t, e.target.value)}
                      className="rounded-lg border border-zinc-300 p-1 text-sm"
                    >
                      {STATUS_CODES.map((k) => (
                        <option key={k} value={k}>
                          {statusLabel(k)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    statusLabel(t.status)
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
                        {tr("common.edit")}
                      </button>
                      <button onClick={() => deleteTask(t.id)} className="text-red-700">
                        {tr("common.delete")}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-zinc-500">
                  {tr("tasks.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}