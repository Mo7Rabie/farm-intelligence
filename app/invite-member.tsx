"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const roles: [string, string][] = [
  ["viewer", "مشاهد"],
  ["analyst", "محلل"],
  ["supervisor", "مشرف"],
  ["accountant", "محاسب"],
  ["farm_manager", "مدير مزرعة"],
  ["owner", "مالك"],
];

export default function InviteMember({ orgId }: { orgId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const input = "rounded-lg border border-zinc-300 p-2 text-sm";

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    setOk(null);
    const { error } = await createClient().rpc("add_member_by_email", {
      p_org: orgId,
      p_email: String(fd.get("email") ?? ""),
      p_role: String(fd.get("role") ?? "viewer"),
    });
    if (error) setError(error.message);
    else { setOk("تمت إضافة العضو"); form.reset(); }
  }

  return (
    <form onSubmit={invite} className="rounded-xl border border-zinc-200 p-4">
      <p className="mb-3 font-medium">دعوة عضو</p>
      {error && <p className="mb-2 text-sm text-red-800">{error}</p>}
      {ok && <p className="mb-2 text-sm text-green-800">{ok}</p>}
      <div className="flex flex-col gap-2">
        <input name="email" type="email" required placeholder="إيميل العضو" className={input} />
        <select name="role" defaultValue="viewer" className={input}>
          {roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="rounded-lg bg-green-800 px-4 py-2 text-sm text-white">إضافة</button>
      </div>
    </form>
  );
}