"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang, type Key } from "../i18n";

type Msg = { key: Key; detail?: string } | null;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useLang();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setOk(false); setMsg({ key: "reset.err.mismatch" }); return; }
    setBusy(true);
    setMsg(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) { setOk(false); setMsg({ key: "reset.err.update", detail: error.message }); }
    else {
      setOk(true);
      setMsg({ key: "reset.ok" });
      setTimeout(() => { window.location.href = "/"; }, 1500);
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-1 text-2xl font-semibold text-green-900">Farm Intelligence</h1>
      <p className="mb-6 text-sm text-zinc-500">{t("reset.title")}</p>

      {!ready ? (
        <p className="text-sm text-zinc-500">{t("reset.verifying")}</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="password" required minLength={6} placeholder={t("reset.newPassword")} dir="ltr"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-zinc-300 p-2"
          />
          <input
            type="password" required minLength={6} placeholder={t("reset.confirm")} dir="ltr"
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="rounded-lg border border-zinc-300 p-2"
          />
          <button disabled={busy} className="rounded-lg bg-green-800 p-2 text-white disabled:opacity-50">
            {busy ? t("common.saving") : t("reset.submit")}
          </button>
        </form>
      )}

      {msg && (
        <p className={"mt-3 text-sm " + (ok ? "text-green-800" : "text-red-700")}>
          {t(msg.key)}
          {msg.detail ? " " + msg.detail : ""}
        </p>
      )}
    </main>
  );
}