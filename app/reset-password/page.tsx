"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
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
    if (password !== confirm) { setOk(false); setMsg("كلمتا المرور غير متطابقتين"); return; }
    setBusy(true);
    setMsg(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) { setOk(false); setMsg("تعذر تغيير كلمة المرور: " + error.message); }
    else {
      setOk(true);
      setMsg("تم تغيير كلمة المرور بنجاح. جارٍ تحويلك...");
      setTimeout(() => router.push("/"), 1500);
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-1 text-2xl font-semibold text-green-900">Farm Intelligence</h1>
      <p className="mb-6 text-sm text-zinc-500">تعيين كلمة مرور جديدة</p>

      {!ready ? (
        <p className="text-sm text-zinc-500">
          جارٍ التحقق من الرابط... لو استمرت الرسالة، افتح رابط الإعادة من بريدك مرة أخرى.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="password" required minLength={6} placeholder="كلمة المرور الجديدة" dir="ltr"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-zinc-300 p-2"
          />
          <input
            type="password" required minLength={6} placeholder="أعد كتابة كلمة المرور" dir="ltr"
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="rounded-lg border border-zinc-300 p-2"
          />
          <button disabled={busy} className="rounded-lg bg-green-800 p-2 text-white disabled:opacity-50">
            {busy ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
          </button>
        </form>
      )}

      {msg && <p className={"mt-3 text-sm " + (ok ? "text-green-800" : "text-red-700")}>{msg}</p>}
    </main>
  );
}