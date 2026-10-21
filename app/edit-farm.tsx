"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Farm = { id: string; name: string; location: string | null };

export default function EditFarm({
  farm, onDone,
}: {
  farm: Farm;
  onDone: (changed: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const input = "rounded-lg border border-zinc-300 p-2 text-sm";

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) { setError("اسم المزرعة مطلوب"); return; }
    const { error } = await createClient().from("farms").update({
      name,
      location: String(fd.get("location") ?? "").trim() || null,
    }).eq("id", farm.id);
    if (error) setError(error.message); else onDone(true);
  }

  return (
    <form onSubmit={save} className="mt-6 rounded-xl border border-green-800 p-4">
      <p className="mb-3 font-medium">تعديل المزرعة</p>
      {error && <p className="mb-2 text-sm text-red-800">{error}</p>}
      <div className="flex flex-col gap-2">
        <input name="name" defaultValue={farm.name} required placeholder="اسم المزرعة" className={input} />
        <input name="location" defaultValue={farm.location ?? ""} placeholder="الموقع (اختياري)" className={input} />
        <div className="flex gap-2">
          <button className="rounded-lg bg-green-800 px-4 py-2 text-sm text-white">حفظ</button>
          <button type="button" onClick={() => onDone(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">إلغاء</button>
        </div>
      </div>
    </form>
  );
}