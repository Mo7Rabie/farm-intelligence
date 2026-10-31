"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useData } from "../use-data";
import { useLang, type Key, type TFn } from "../i18n";

type Item = {
  id: string;
  farm_id: string | null;
  name: string;
  sku: string;
  category: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_price: number;
  notes: string | null;
  last_movement_at: string | null;
  updated_at: string;
};
type Movement = {
  id: string;
  movement_type: string;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  difference: number;
  unit_price: number | null;
  movement_date: string;
  reason: string | null;
  created_by: string;
  created_at: string;
};
type Member = { user_id: string; email: string; role: string };

const CATEGORIES: Record<string, Key> = {
  fertilizers: "inv.cat.fertilizers",
  pesticides: "inv.cat.pesticides",
  irrigation: "inv.cat.irrigation",
  seeds: "inv.cat.seeds",
  tools: "inv.cat.tools",
  other: "inv.cat.other",
};
const UNITS: Record<string, Key> = {
  kg: "inv.unit.kg",
  g: "inv.unit.g",
  l: "inv.unit.l",
  ml: "inv.unit.ml",
  bag: "inv.unit.bag",
  piece: "inv.unit.piece",
  other: "inv.unit.other",
};
const MOVEMENTS: Record<string, Key> = {
  purchase: "inv.mv.purchase",
  issue: "inv.mv.issue",
  return: "inv.mv.return",
  adjustment: "inv.mv.adjustment",
};

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 3 });
}
function money(n: number) {
  return `AED ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
function dbMessage(err: { message: string; code?: string }, t: TFn) {
  if (err.code === "23505") return t("inv.err.skuUsed");
  return err.message;
}

export default function InventoryPage() {
  const { t } = useLang();
  const { loading, orgId, role, farms, error: dataError } = useData();
  const [items, setItems] = useState<Item[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [history, setHistory] = useState<Movement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [moveItem, setMoveItem] = useState<Item | null>(null);
  const [moveType, setMoveType] = useState("purchase");
  const [historyItem, setHistoryItem] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fFarm, setFFarm] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);

  const canManage = role === "owner" || role === "farm_manager";
  const canMove = canManage || role === "accountant";

  const catLabel = (k: string) => (CATEGORIES[k] ? t(CATEGORIES[k]) : k);
  const unitLabel = (k: string) => (UNITS[k] ? t(UNITS[k]) : k);
  const moveLabel = (k: string) => (MOVEMENTS[k] ? t(MOVEMENTS[k]) : k);

  const loadItems = useCallback(async () => {
    if (!orgId) return;
    const supabase = createClient();
    const [i, m] = await Promise.all([
      supabase
        .from("inventory_items")
        .select(
          "id, farm_id, name, sku, category, unit, quantity, min_stock, unit_price, notes, last_movement_at, updated_at",
        )
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name"),
      supabase.rpc("list_members", { org: orgId }),
    ]);
    if (i.error) setError(dbMessage(i.error, t));
    else
      setItems(
        ((i.data as Item[]) ?? []).map((x) => ({
          ...x,
          quantity: Number(x.quantity),
          min_stock: Number(x.min_stock),
          unit_price: Number(x.unit_price),
        })),
      );
    if (!m.error) setMembers((m.data as Member[]) ?? []);
  }, [orgId, t]);

  const loadHistory = useCallback(
    async (item: Item) => {
      const { data, error: err } = await createClient()
        .from("inventory_movements")
        .select(
          "id, movement_type, quantity, quantity_before, quantity_after, difference, unit_price, movement_date, reason, created_by, created_at",
        )
        .eq("item_id", item.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (err) {
        setError(dbMessage(err, t));
        return;
      }
      setHistory(
        ((data as Movement[]) ?? []).map((x) => ({
          ...x,
          quantity: Number(x.quantity),
          quantity_before: Number(x.quantity_before),
          quantity_after: Number(x.quantity_after),
          difference: Number(x.difference),
          unit_price: x.unit_price === null ? null : Number(x.unit_price),
        })),
      );
    },
    [t],
  );

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function saveItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    if (!orgId || !canManage) return;
    setError(null);
    setNotice(null);
    const fd = new FormData(e.currentTarget);
    const minStock = Number(fd.get("min_stock") || 0);
    const unitPrice = Number(fd.get("unit_price") || 0);
    const payload = {
      farm_id: String(fd.get("farm_id") ?? "") || null,
      name: String(fd.get("name") ?? "").trim(),
      sku: String(fd.get("sku") ?? "").trim(),
      category: String(fd.get("category") ?? "other"),
      unit: String(fd.get("unit") ?? "piece"),
      min_stock: minStock,
      unit_price: unitPrice,
      notes: String(fd.get("notes") ?? "").trim() || null,
    };
    if (!payload.name) {
      setError(t("inv.err.nameRequired"));
      return;
    }
    if (!payload.sku) {
      setError(t("inv.err.skuRequired"));
      return;
    }
    if (!Number.isFinite(minStock) || minStock < 0) {
      setError(t("inv.err.minNeg"));
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError(t("inv.err.priceNeg"));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: err } = editing
      ? await supabase.from("inventory_items").update(payload).eq("id", editing.id)
      : await supabase.from("inventory_items").insert({ ...payload, organization_id: orgId });
    setSaving(false);
    if (err) {
      setError(dbMessage(err, t));
      return;
    }
    setShowForm(false);
    setEditing(null);
    await loadItems();
  }

  async function saveMovement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    if (!orgId || !moveItem || !canMove) return;
    setError(null);
    setNotice(null);
    const fd = new FormData(e.currentTarget);
    const type = moveType;
    const qty = Number(fd.get("quantity"));
    const reason = String(fd.get("reason") ?? "").trim();
    const date = String(fd.get("movement_date") ?? "") || todayStr();
    const price = String(fd.get("unit_price") ?? "");
    if (type === "adjustment" && !canManage) {
      setError(t("inv.err.adjOwnerOnly"));
      return;
    }
    if (!Number.isFinite(qty) || qty < 0 || (type !== "adjustment" && qty <= 0)) {
      setError(type === "adjustment" ? t("inv.err.actualNeg") : t("inv.err.qtyPositive"));
      return;
    }
    if ((type === "issue" || type === "adjustment") && !reason) {
      setError(t("inv.err.reasonRequired"));
      return;
    }
    if (type === "issue" && qty > moveItem.quantity) {
      setError(t("inv.err.issueTooMuch", { max: fmt(moveItem.quantity) }));
      return;
    }
    if (price !== "" && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
      setError(t("inv.err.priceInvalid"));
      return;
    }
    if (date > todayStr()) {
      setError(t("inv.err.futureDate"));
      return;
    }
    setSaving(true);
    const { error: err } = await createClient().from("inventory_movements").insert({
      organization_id: orgId,
      item_id: moveItem.id,
      movement_type: type,
      quantity: qty,
      movement_date: date,
      reason: reason || null,
      unit_price: type === "purchase" && price !== "" ? Number(price) : null,
    });
    setSaving(false);
    if (err) {
      setError(dbMessage(err, t));
      return;
    }
    setNotice(t("inv.notice.recorded"));
    const done = moveItem;
    setMoveItem(null);
    await loadItems();
    if (historyItem?.id === done.id) await loadHistory(done);
  }

  function openMove(item: Item, type: string) {
    setMoveItem(item);
    setMoveType(type);
    setShowForm(false);
    setEditing(null);
    setError(null);
    setNotice(null);
  }

  async function openHistory(item: Item) {
    setHistoryItem(item);
    setHistory([]);
    await loadHistory(item);
  }

  async function deleteItem(item: Item) {
    if (!confirm(t("inv.confirmDelete", { name: item.name }))) return;
    setError(null);
    setNotice(null);
    const { error: err } = await createClient().from("inventory_items").delete().eq("id", item.id);
    if (err) {
      setError(
        err.code === "23503" || err.code === "23001" ? t("inv.err.hasMovements") : dbMessage(err, t),
      );
    } else {
      await loadItems();
    }
  }

  if (loading) return <p className="text-zinc-500">{t("common.loading")}</p>;

  const farmName = (id: string | null) =>
    id ? (farms.find((f) => f.id === id)?.name ?? "-") : t("inv.central");
  const who = (id: string) => members.find((m) => m.user_id === id)?.email ?? t("tasks.member");
  const isLow = (i: Item) => i.min_stock > 0 && i.quantity <= i.min_stock;

  const q = search.trim().toLowerCase();
  const visible = items.filter(
    (i) =>
      (!q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)) &&
      (!fCategory || i.category === fCategory) &&
      (!fFarm || (fFarm === "central" ? i.farm_id === null : i.farm_id === fFarm)) &&
      (!onlyLow || isLow(i)),
  );

  const totalItems = items.length;
  const lowItems = items.filter(isLow);
  const lowCount = lowItems.length;
  const totalValue = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const canAdjust = canManage;
  const lastDate = (i: Item) => (i.last_movement_at ?? i.updated_at).slice(0, 10);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t("inv.title")}</h1>
        {canManage && (
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
              setMoveItem(null);
              setError(null);
              setNotice(null);
            }}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white"
          >
            {t("inv.new")}
          </button>
        )}
      </div>

      {(error || dataError) && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error ?? dataError}</p>
      )}
      {notice && <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

      {lowCount > 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {t("inv.alert.low", {
            n: lowCount,
            names:
              lowItems
                .slice(0, 5)
                .map((i) => i.name)
                .join(t("common.listSep")) + (lowCount > 5 ? " ..." : ""),
          })}
        </p>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">{t("inv.stat.items")}</p>
          <p className="text-2xl font-bold">{totalItems}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">{t("inv.stat.low")}</p>
          <p className={`text-2xl font-bold ${lowCount > 0 ? "text-amber-700" : ""}`}>{lowCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">{t("inv.stat.value")}</p>
          <p className="text-2xl font-bold">{money(totalValue)}</p>
        </div>
      </div>

      {showForm && canManage && (
        <form
          key={editing?.id ?? "new"}
          onSubmit={saveItem}
          className="mb-6 grid max-w-3xl gap-3 rounded-xl border border-zinc-200 p-4 md:grid-cols-2"
        >
          <h2 className="font-medium md:col-span-2">{editing ? t("inv.form.edit") : t("inv.form.new")}</h2>
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={editing?.name ?? ""}
            placeholder={t("inv.field.name")}
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          />
          <input
            name="sku"
            required
            maxLength={50}
            defaultValue={editing?.sku ?? ""}
            placeholder={t("inv.field.sku")}
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          />
          <select
            name="category"
            defaultValue={editing?.category ?? "fertilizers"}
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          >
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {t(v)}
              </option>
            ))}
          </select>
          <select
            name="unit"
            defaultValue={editing?.unit ?? "kg"}
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          >
            {Object.entries(UNITS).map(([k, v]) => (
              <option key={k} value={k}>
                {t(v)}
              </option>
            ))}
          </select>
          <select
            name="farm_id"
            defaultValue={editing?.farm_id ?? ""}
            className="rounded-lg border border-zinc-300 p-2 text-sm md:col-span-2"
          >
            <option value="">{t("inv.field.central")}</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <label className="text-sm">
            {t("inv.field.minStock")}
            <input
              type="number"
              name="min_stock"
              min="0"
              step="0.001"
              defaultValue={editing?.min_stock ?? 0}
              className="mt-1 block w-full rounded-lg border border-zinc-300 p-2"
            />
          </label>
          <label className="text-sm">
            {t("inv.field.unitPrice")}
            <input
              type="number"
              name="unit_price"
              min="0"
              step="0.01"
              defaultValue={editing?.unit_price ?? 0}
              className="mt-1 block w-full rounded-lg border border-zinc-300 p-2"
            />
          </label>
          <textarea
            name="notes"
            defaultValue={editing?.notes ?? ""}
            placeholder={t("inv.field.notes")}
            className="rounded-lg border border-zinc-300 p-2 text-sm md:col-span-2"
          />
          {!editing && <p className="text-xs text-zinc-500 md:col-span-2">{t("inv.newItemNote")}</p>}
          <div className="flex gap-2 md:col-span-2">
            <button
              disabled={saving}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? t("common.saving") : t("common.save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}

      {moveItem && canMove && (
        <form
          key={`${moveItem.id}-${moveType}`}
          onSubmit={saveMovement}
          className="mb-6 grid max-w-3xl gap-3 rounded-xl border border-zinc-200 p-4 md:grid-cols-2"
        >
          <h2 className="font-medium md:col-span-2">
            {t("inv.move.title", {
              name: moveItem.name,
              qty: fmt(moveItem.quantity),
              unit: unitLabel(moveItem.unit),
            })}
          </h2>
          <select
            value={moveType}
            onChange={(e) => setMoveType(e.target.value)}
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          >
            {Object.entries(MOVEMENTS)
              .filter(([k]) => k !== "adjustment" || canAdjust)
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {t(v)}
                </option>
              ))}
          </select>
          <label className="text-sm">
            {moveType === "adjustment" ? t("inv.field.actualQty") : t("inv.field.qty")}
            <input
              type="number"
              name="quantity"
              required
              min={moveType === "adjustment" ? "0" : "0.001"}
              step="0.001"
              className="mt-1 block w-full rounded-lg border border-zinc-300 p-2"
            />
          </label>
          <label className="text-sm">
            {t("inv.field.date")}
            <input
              type="date"
              name="movement_date"
              max={todayStr()}
              defaultValue={todayStr()}
              className="mt-1 block w-full rounded-lg border border-zinc-300 p-2"
            />
          </label>
          {moveType === "purchase" && (
            <label className="text-sm">
              {t("inv.field.priceOptional")}
              <input
                type="number"
                name="unit_price"
                min="0"
                step="0.01"
                defaultValue={moveItem.unit_price}
                className="mt-1 block w-full rounded-lg border border-zinc-300 p-2"
              />
            </label>
          )}
          <input
            name="reason"
            placeholder={
              moveType === "issue" || moveType === "adjustment"
                ? t("inv.field.reasonRequired")
                : t("inv.field.reasonOptional")
            }
            className="rounded-lg border border-zinc-300 p-2 text-sm md:col-span-2"
          />
          <div className="flex gap-2 md:col-span-2">
            <button
              disabled={saving}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? t("common.saving") : t("inv.btn.recordMove")}
            </button>
            <button
              type="button"
              onClick={() => setMoveItem(null)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("inv.search")}
          className="col-span-2 rounded-lg border border-zinc-300 p-2 text-sm md:col-span-1"
        />
        <select
          value={fCategory}
          onChange={(e) => setFCategory(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2 text-sm"
        >
          <option value="">{t("inv.filter.allCategories")}</option>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {t(v)}
            </option>
          ))}
        </select>
        <select
          value={fFarm}
          onChange={(e) => setFFarm(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2 text-sm"
        >
          <option value="">{t("inv.filter.allLocations")}</option>
          <option value="central">{t("inv.central")}</option>
          {farms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-zinc-300 p-2 text-sm md:col-span-2">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          {t("inv.onlyLow")}
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-start">
            <tr>
              <th className="p-3 text-start">{t("inv.col.item")}</th>
              <th className="p-3 text-start">{t("inv.col.category")}</th>
              <th className="p-3 text-start">{t("inv.col.location")}</th>
              <th className="p-3 text-start">{t("inv.col.qty")}</th>
              <th className="p-3 text-start">{t("inv.col.min")}</th>
              <th className="p-3 text-start">{t("inv.col.price")}</th>
              <th className="p-3 text-start">{t("inv.col.value")}</th>
              <th className="p-3 text-start">{t("inv.col.updated")}</th>
              <th className="p-3 text-start">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((i) => (
              <tr key={i.id} className="border-t border-zinc-100">
                <td className="p-3">
                  <p className="font-medium">{i.name}</p>
                  <p className="text-xs text-zinc-500">{i.sku}</p>
                </td>
                <td className="p-3">{catLabel(i.category)}</td>
                <td className="p-3">{farmName(i.farm_id)}</td>
                <td className="whitespace-nowrap p-3">
                  <span className={isLow(i) ? "font-bold text-red-700" : ""}>
                    {fmt(i.quantity)} {unitLabel(i.unit)}
                  </span>
                  {isLow(i) && <span className="ms-2 text-xs text-red-700">{t("inv.low")}</span>}
                </td>
                <td className="p-3">{fmt(i.min_stock)}</td>
                <td className="whitespace-nowrap p-3">{money(i.unit_price)}</td>
                <td className="whitespace-nowrap p-3">{money(i.quantity * i.unit_price)}</td>
                <td className="whitespace-nowrap p-3">{lastDate(i)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {canMove && (
                      <>
                        <button onClick={() => openMove(i, "purchase")} className="text-green-700">
                          {t("inv.act.purchase")}
                        </button>
                        <button onClick={() => openMove(i, "issue")} className="text-green-700">
                          {t("inv.act.issue")}
                        </button>
                        <button onClick={() => openMove(i, "return")} className="text-green-700">
                          {t("inv.act.return")}
                        </button>
                      </>
                    )}
                    {canAdjust && (
                      <button onClick={() => openMove(i, "adjustment")} className="text-green-700">
                        {t("inv.act.adjust")}
                      </button>
                    )}
                    <button onClick={() => openHistory(i)} className="text-zinc-700">
                      {t("inv.act.history")}
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => {
                            setEditing(i);
                            setShowForm(true);
                            setMoveItem(null);
                            setError(null);
                            setNotice(null);
                          }}
                          className="text-green-700"
                        >
                          {t("common.edit")}
                        </button>
                        <button onClick={() => deleteItem(i)} className="text-red-700">
                          {t("common.delete")}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-zinc-500">
                  {t("inv.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {historyItem && (
        <section className="mt-6 rounded-xl border border-zinc-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">{t("inv.hist.title", { name: historyItem.name })}</h2>
            <button onClick={() => setHistoryItem(null)} className="text-sm text-zinc-600">
              {t("nav.close")}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-start">
                <tr>
                  <th className="p-2 text-start">{t("inv.field.date")}</th>
                  <th className="p-2 text-start">{t("inv.hist.type")}</th>
                  <th className="p-2 text-start">{t("inv.col.qty")}</th>
                  <th className="p-2 text-start">{t("inv.hist.before")}</th>
                  <th className="p-2 text-start">{t("inv.hist.after")}</th>
                  <th className="p-2 text-start">{t("inv.hist.diff")}</th>
                  <th className="p-2 text-start">{t("inv.hist.reason")}</th>
                  <th className="p-2 text-start">{t("inv.hist.user")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((m) => (
                  <tr key={m.id} className="border-t border-zinc-100">
                    <td className="whitespace-nowrap p-2">{m.movement_date}</td>
                    <td className="p-2">{moveLabel(m.movement_type)}</td>
                    <td className="p-2">{fmt(m.quantity)}</td>
                    <td className="p-2">{fmt(m.quantity_before)}</td>
                    <td className="p-2">{fmt(m.quantity_after)}</td>
                    <td className={`p-2 ${m.difference < 0 ? "text-red-700" : "text-green-700"}`}>
                      {m.difference > 0 ? "+" : ""}
                      {fmt(m.difference)}
                    </td>
                    <td className="p-2">{m.reason ?? "-"}</td>
                    <td className="p-2">{who(m.created_by)}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-zinc-500">
                      {t("inv.hist.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}