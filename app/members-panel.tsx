"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang, type Key } from "./i18n";

type Member = { user_id: string; email: string; role: string };

const ROLES: [string, Key][] = [
  ["owner", "role.owner"],
  ["farm_manager", "role.farm_manager"],
  ["accountant", "role.accountant"],
  ["supervisor", "role.supervisor"],
  ["analyst", "role.analyst"],
  ["viewer", "role.viewer"],
];

export default function MembersPanel({ orgId }: { orgId: string }) {
  const { t } = useLang();
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState("");
  const [msg, setMsg] = useState("");
  const [changed, setChanged] = useState(false);

  const roleLabel = (r: string) => {
    const hit = ROLES.find(([v]) => v === r);
    return hit ? t(hit[1]) : r;
  };

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
    setMsg(error ? error.message : "");
    setChanged(!error);
    load();
  }

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 p-6">
      <h2 className="mb-3 font-medium">{t("members.panelTitle")}</h2>
      {msg && <p className="mb-2 text-sm text-zinc-600">{msg}</p>}
      {changed && !msg && (
        <p className="mb-2 text-sm text-zinc-600">{t("members.roleChanged")}</p>
      )}
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between text-sm">
            <span dir="ltr">{m.email}</span>
            {m.user_id === me ? (
              <span className="text-zinc-500">
                {roleLabel(m.role)} {t("members.you")}
              </span>
            ) : (
              <select
                value={m.role}
                onChange={(e) => change(m.user_id, e.target.value)}
                className="rounded-lg border border-zinc-300 p-1 text-sm"
              >
                {ROLES.map(([v, k]) => (
                  <option key={v} value={v}>
                    {t(k)}
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