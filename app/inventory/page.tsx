"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useData } from "../use-data";

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

const CATEGORIES: Record<string, string> = {
  fertilizers: "أسمدة",
  pesticides: "مبيدات",
  irrigation: "مستلزمات ري",
  seeds: "بذور وشتلات",
  tools: "أدوات ومعدات",
  other: "مستلزمات أخرى",
};
const UNITS: Record<string, string> = {
  kg: "كيلوجرام",
  g: "جرام",
  l: "لتر",
  ml: "ملليلتر",
  bag: "كيس",
  piece: "قطعة",
  other: "وحدة أخرى",
};
const MOVEMENTS: Record<string, string> = {
  purchase: "شراء",
  issue: "صرف",
  return: "مرتجع",
  adjustment: "تسوية جرد",
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
function dbMessage(err: { message: string; code?: string }) {
  if (err.code === "23505") return "كود الصنف مستخدم من قبل في هذه المؤسسة";
  return err.message;
}

export default function InventoryPage() {
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
  const [search, setSearch] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fFarm, setFFarm] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);

  const canManage = role === "owner" || role === "farm_manager";
  const canMove = canManage || role === "accountant";

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
    if (i.error) setError(dbMessage(i.error));
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
  }, [orgId]);

  const loadHistory = useCallback(async (item: Item) => {
    const { data, error: err } = await createClient()
      .from("inventory_movements")
      .select(
        "id, movement_type, quantity, quantity_before, quantity_after, difference, unit_price, movement_date, reason, created_by, created_at",
      )
      .eq("item_id", item.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (err) {
      setError(dbMessage(err));
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
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function saveItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      setError("اسم الصنف مطلوب");
      return;
    }
    if (!payload.sku) {
      setError("كود الصنف مطلوب");
      return;
    }
    if (!Number.isFinite(minStock) || minStock < 0) {
      setError("الحد الأدنى لا يمكن أن يكون سالباً");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError("سعر الوحدة لا يمكن أن يكون سالباً");
      return;
    }
    const supabase = createClient();
    const { error: err } = editing
      ? await supabase.from("inventory_items").update(payload).eq("id", editing.id)
      : await supabase.from("inventory_items").insert({ ...payload, organization_id: orgId });
    if (err) {
      setError(dbMessage(err));
      return;
    }
    setShowForm(false);
    setEditing(null);
    await loadItems();
  }

  async function saveMovement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      setError("تسوية الجرد للمالك ومدير المزرعة فقط");
      return;
    }
    if (!Number.isFinite(qty) || qty < 0 || (type !== "adjustment" && qty <= 0)) {
      setError(
        type === "adjustment"
          ? "الكمية الفعلية لا يمكن أن تكون سالبة"
          : "الكمية يجب أن تكون أكبر من صفر",
      );
      return;
    }
    if ((type === "issue" || type === "adjustment") && !reason) {
      setError("السبب مطلوب للصرف وتسوية الجرد");
      return;
    }
    if (type === "issue" && qty > moveItem.quantity) {
      setError(`الكمية المصروفة أكبر من المتاح (${fmt(moveItem.quantity)})`);
      return;
    }
    if (price !== "" && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
      setError("سعر الوحدة غير صالح");
      return;
    }
    if (date > todayStr()) {
      setError("لا يمكن تسجيل حركة بتاريخ مستقبلي");
      return;
    }
    const { error: err } = await createClient().from("inventory_movements").insert({
      organization_id: orgId,
      item_id: moveItem.id,
      movement_type: type,
      quantity: qty,
      movement_date: date,
      reason: reason || null,
      unit_price: type === "purchase" && price !== "" ? Number(price) : null,
    });
    if (err) {
      setError(dbMessage(err));
      return;
    }
    setNotice("تم تسجيل الحركة");
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
    if (!confirm(`هل تريد حذف الصنف "${item.name}"؟`)) return;
    setError(null);
    setNotice(null);
    const { error: err } = await createClient().from("inventory_items").delete().eq("id", item.id);
    if (err) {
      setError(
        err.code === "23503" || err.code === "23001"
          ? "لا يمكن حذف صنف عليه حركات مخزون، سجّل صرفاً أو تسوية جرد بدلاً من الحذف"
          : dbMessage(err),
      );
    } else {
      await loadItems();
    }
  }

  if (loading) return <p className="text-zinc-500">جار التحميل...</p>;

  const farmName = (id: string | null) =>
    id ? (farms.find((f) => f.id === id)?.name ?? "-") : "المخزن المركزي";
  const who = (id: string) => members.find((m) => m.user_id === id)?.email ?? "عضو";
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
        <h1 className="text-xl font-bold">المخزون</h1>
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
            + صنف جديد
          </button>
        )}
      </div>

      {(error || dataError) && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error ?? dataError}</p>
      )}
      {notice && <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

      {lowCount > 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          تنبيه: يوجد {lowCount} صنف وصل للحد الأدنى أو أقل منه:{" "}
          {lowItems
            .slice(0, 5)
            .map((i) => i.name)
            .join("، ")}
          {lowCount > 5 ? " ..." : ""}
        </p>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">عدد الأصناف</p>
          <p className="text-2xl font-bold">{totalItems}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">أصناف منخفضة المخزون</p>
          <p className={`text-2xl font-bold ${lowCount > 0 ? "text-amber-700" : ""}`}>{lowCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">إجمالي قيمة المخزون</p>
          <p className="text-2xl font-bold">{money(totalValue)}</p>
        </div>
      </div>

      {showForm && canManage && (
        <form
          key={editing?.id ?? "new"}
          onSubmit={saveItem}
          className="mb-6 grid max-w-3xl gap-3 rounded-xl border border-zinc-200 p-4 md:grid-cols-2"
        >
          <h2 className="font-medium md:col-span-2">{editing ? "تعديل صنف" : "صنف جديد"}</h2>
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={editing?.name ?? ""}
            placeholder="اسم الصنف"
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          />
          <input
            name="sku"
            required
            maxLength={50}
            defaultValue={editing?.sku ?? ""}
            placeholder="كود الصنف"
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          />
          <select
            name="category"
            defaultValue={editing?.category ?? "fertilizers"}
            className="rounded-lg border border-zinc-300 p-2 text-sm"
          >
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
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
                {v}
              </option>
            ))}
          </select>
          <select
            name="farm_id"
            defaultValue={editing?.farm_id ?? ""}
            className="rounded-lg border border-zinc-300 p-2 text-sm md:col-span-2"
          >
            <option value="">المخزن المركزي (بدون مزرعة)</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <label className="text-sm">
            الحد الأدنى للمخزون
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
            سعر الوحدة (AED)
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
            placeholder="ملاحظات"
            className="rounded-lg border border-zinc-300 p-2 text-sm md:col-span-2"
          />
          {!editing && (
            <p className="text-xs text-zinc-500 md:col-span-2">
              الصنف الجديد يبدأ برصيد صفر، سجّل حركة شراء أو تسوية جرد لإدخال الرصيد.
            </p>
          )}
          <div className="flex gap-2 md:col-span-2">
            <button className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white">حفظ</button>
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

      {moveItem && canMove && (
        <form
          key={`${moveItem.id}-${moveType}`}
          onSubmit={saveMovement}
          className="mb-6 grid max-w-3xl gap-3 rounded-xl border border-zinc-200 p-4 md:grid-cols-2"
        >
          <h2 className="font-medium md:col-span-2">
            حركة مخزون: {moveItem.name} (الرصيد الحالي {fmt(moveItem.quantity)} {UNITS[moveItem.unit]})
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
                  {v}
                </option>
              ))}
          </select>
          <label className="text-sm">
            {moveType === "adjustment" ? "الكمية الفعلية بعد الجرد" : "الكمية"}
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
            التاريخ
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
              سعر الوحدة (اختياري)
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
              moveType === "issue" || moveType === "adjustment" ? "السبب (مطلوب)" : "السبب أو المرجع (اختياري)"
            }
            className="rounded-lg border border-zinc-300 p-2 text-sm md:col-span-2"
          />
          <div className="flex gap-2 md:col-span-2">
            <button className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white">تسجيل الحركة</button>
            <button
              type="button"
              onClick={() => setMoveItem(null)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الكود"
          className="col-span-2 rounded-lg border border-zinc-300 p-2 text-sm md:col-span-1"
        />
        <select
          value={fCategory}
          onChange={(e) => setFCategory(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2 text-sm"
        >
          <option value="">كل التصنيفات</option>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={fFarm}
          onChange={(e) => setFFarm(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2 text-sm"
        >
          <option value="">كل المزارع والمخازن</option>
          <option value="central">المخزن المركزي</option>
          {farms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-zinc-300 p-2 text-sm md:col-span-2">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          المنخفضة فقط
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-right">
            <tr>
              <th className="p-3">الصنف</th>
              <th className="p-3">التصنيف</th>
              <th className="p-3">المزرعة / المخزن</th>
              <th className="p-3">الكمية</th>
              <th className="p-3">الحد الأدنى</th>
              <th className="p-3">سعر الوحدة</th>
              <th className="p-3">القيمة</th>
              <th className="p-3">آخر تحديث</th>
              <th className="p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((i) => (
              <tr key={i.id} className="border-t border-zinc-100">
                <td className="p-3">
                  <p className="font-medium">{i.name}</p>
                  <p className="text-xs text-zinc-500">{i.sku}</p>
                </td>
                <td className="p-3">{CATEGORIES[i.category] ?? i.category}</td>
                <td className="p-3">{farmName(i.farm_id)}</td>
                <td className="whitespace-nowrap p-3">
                  <span className={isLow(i) ? "font-bold text-red-700" : ""}>
                    {fmt(i.quantity)} {UNITS[i.unit] ?? i.unit}
                  </span>
                  {isLow(i) && <span className="mr-2 text-xs text-red-700">منخفض</span>}
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
                          شراء
                        </button>
                        <button onClick={() => openMove(i, "issue")} className="text-green-700">
                          صرف
                        </button>
                        <button onClick={() => openMove(i, "return")} className="text-green-700">
                          مرتجع
                        </button>
                      </>
                    )}
                    {canAdjust && (
                      <button onClick={() => openMove(i, "adjustment")} className="text-green-700">
                        جرد
                      </button>
                    )}
                    <button onClick={() => openHistory(i)} className="text-zinc-700">
                      السجل
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
                          تعديل
                        </button>
                        <button onClick={() => deleteItem(i)} className="text-red-700">
                          حذف
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
                  لا توجد أصناف
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {historyItem && (
        <section className="mt-6 rounded-xl border border-zinc-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">سجل حركات: {historyItem.name}</h2>
            <button onClick={() => setHistoryItem(null)} className="text-sm text-zinc-600">
              إغلاق
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-right">
                <tr>
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">النوع</th>
                  <th className="p-2">الكمية</th>
                  <th className="p-2">قبل</th>
                  <th className="p-2">بعد</th>
                  <th className="p-2">الفرق</th>
                  <th className="p-2">السبب</th>
                  <th className="p-2">المستخدم</th>
                </tr>
              </thead>
              <tbody>
                {history.map((m) => (
                  <tr key={m.id} className="border-t border-zinc-100">
                    <td className="whitespace-nowrap p-2">{m.movement_date}</td>
                    <td className="p-2">{MOVEMENTS[m.movement_type] ?? m.movement_type}</td>
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
                      لا توجد حركات
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