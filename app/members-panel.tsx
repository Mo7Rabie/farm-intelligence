"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Member = { user_id: string; email: string; role: string };

const ROLES = ["owner", "farm_manager", "accountant", "supervisor", "analyst", "viewer"];

export default function MembersPanel({ orgId }: { orgId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: u } = await supabase.auth.getUser();
    setMe(u.user?.id ?? "");
    const { data, error } = await supabase.rpc("list_members", { org: orgId });
    if (error) setMsg(error.message);
    else setMembers((data as Member[]) ?? []);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  async function change(target: string, newRole: string) {
    const supabase = createClient();
    const { error } = await supabase.rpc("change_member_role", {
      org: orgId,
      target,
      new_role: newRole,
    });
    setMsg(error ? error.message : "تم تغيير الدور");
    load();
  }

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 p-6">
      <h2 className="mb-3 font-medium">أعضاء المؤسسة</h2>
      {msg && <p className="mb-2 text-sm text-zinc-600">{msg}</p>}
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between text-sm">
            <span>{m.email}</span>
            {m.user_id === me ? (
              <span className="text-zinc-500">{m.role} (أنت)</span>
            ) : (
              <select
                value={m.role}
                onChange={(e) => change(m.user_id, e.target.value)}
                className="rounded-lg border border-zinc-300 p-1 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}