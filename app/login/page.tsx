"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang, type Key } from "../i18n";

type Msg = { key: Key; detail?: string } | null;

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLang();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setOk(false);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ key: "login.err.signin", detail: error.message });
      else router.push("/");
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg({ key: "login.err.signup", detail: error.message });
      else if (data.session) router.push("/");
      else { setOk(true); setMsg({ key: "login.ok.signup" }); }
    }
    setBusy(false);
  }

  async function forgot() {
    if (!email) { setOk(false); setMsg({ key: "login.needEmail" }); return; }
    setBusy(true);
    setMsg(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) { setOk(false); setMsg({ key: "login.err.reset", detail: error.message }); }
    else { setOk(true); setMsg({ key: "login.ok.reset" }); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-1 text-2xl font-semibold text-green-900">Farm Intelligence</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {mode === "signin" ? t("login.signinTitle") : t("login.signupTitle")}
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email" required placeholder={t("login.email")} dir="ltr"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2"
        />
        <input
          type="password" required minLength={6} placeholder={t("login.password")} dir="ltr"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2"
        />
        <button disabled={busy} className="rounded-lg bg-green-800 p-2 text-white disabled:opacity-50">
          {busy ? t("login.busy") : mode === "signin" ? t("login.signin") : t("login.signup")}
        </button>
      </form>

      {msg && (
        <p className={"mt-3 text-sm " + (ok ? "text-green-800" : "text-red-700")}>
          {t(msg.key)}
          {msg.detail ? " " + msg.detail : ""}
        </p>
      )}

      {mode === "signin" && (
        <button type="button" onClick={forgot} disabled={busy} className="mt-3 block text-sm text-zinc-600 underline">
          {t("login.forgot")}
        </button>
      )}

      <button
        onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}
        className="mt-4 text-sm text-green-800 underline"
      >
        {mode === "signin" ? t("login.noAccount") : t("login.haveAccount")}
      </button>
    </main>
  );
}