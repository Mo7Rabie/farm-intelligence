"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
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
      if (error) setMsg("تعذر تسجيل الدخول: " + error.message);
      else router.push("/");
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg("تعذر إنشاء الحساب: " + error.message);
      else if (data.session) router.push("/");
      else { setOk(true); setMsg("تم إنشاء الحساب. افتح بريدك واضغط رابط التأكيد، ثم سجّل الدخول."); }
    }
    setBusy(false);
  }

  async function forgot() {
    if (!email) { setOk(false); setMsg("اكتب بريدك الإلكتروني أولًا ثم اضغط «نسيت كلمة المرور؟»"); return; }
    setBusy(true);
    setMsg(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) { setOk(false); setMsg("تعذر إرسال الرابط: " + error.message); }
    else { setOk(true); setMsg("تم إرسال رابط إعادة التعيين إلى بريدك. افتحه واتبع الخطوات."); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-1 text-2xl font-semibold text-green-900">Farm Intelligence</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email" required placeholder="البريد الإلكتروني" dir="ltr"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2"
        />
        <input
          type="password" required minLength={6} placeholder="كلمة المرور (6 أحرف على الأقل)" dir="ltr"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-zinc-300 p-2"
        />
        <button disabled={busy} className="rounded-lg bg-green-800 p-2 text-white disabled:opacity-50">
          {busy ? "جارٍ التنفيذ..." : mode === "signin" ? "دخول" : "إنشاء الحساب"}
        </button>
      </form>

      {msg && <p className={"mt-3 text-sm " + (ok ? "text-green-800" : "text-red-700")}>{msg}</p>}

      {mode === "signin" && (
        <button type="button" onClick={forgot} disabled={busy} className="mt-3 block text-sm text-zinc-600 underline">
          نسيت كلمة المرور؟
        </button>
      )}

      <button
        onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}
        className="mt-4 text-sm text-green-800 underline"
      >
        {mode === "signin" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب؟ سجّل الدخول"}
      </button>
    </main>
  );
}