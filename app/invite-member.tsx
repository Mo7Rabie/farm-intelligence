"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "./i18n";

const roles = [
  ["viewer", "role.viewer"],
  ["analyst", "role.analyst"],
  ["supervisor", "role.supervisor"],
  ["accountant", "role.accountant"],
  ["farm_manager", "role.farm_manager"],
  ["owner", "role.owner"],
] as const;

export default function InviteMember({ orgId }: { orgId: string }) {
  const { t } = useLang();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const input = "rounded-lg border border-zinc-300 p-2 text-sm";

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    setOk(false);
    const fd2 = Object.fromEntries(fd);
const { error } = await createClient().functions.invoke("invite-member", {
  body: { orgId, email: String(fd2.email ?? ""), role: String(fd2.role ?? "viewer") },
});
    if (error) { const b = await (error as any).context?.json?.().catch(() => null); setError(b?.error ?? error.message); }
    else { setOk(true); form.reset(); }
  }

  return (
    <form onSubmit={invite} className="rounded-xl border border-zinc-200 p-4">
      <p className="mb-3 font-medium">{t("invite.title")}</p>
      {error && <p className="mb-2 text-sm text-red-800">{error}</p>}
      {ok && <p className="mb-2 text-sm text-green-800">{t("invite.added")}</p>}
      <div className="flex flex-col gap-2">
        <input name="email" type="email" required placeholder={t("invite.emailPlaceholder")} className={input} />
        <select name="role" defaultValue="viewer" className={input}>
          {roles.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
        </select>
        <button className="rounded-lg bg-green-800 px-4 py-2 text-sm text-white">{t("invite.submit")}</button>
      </div>
    </form>
  );
}