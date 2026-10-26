"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type Farm = { id: string; name: string; location: string | null };
export type Expense = {
  id: string; farm_id: string; expense_date: string;
  category: string; description: string | null; amount: number; currency: string;
};
type Membership = {
  organization_id: string; role: string;
  organizations: { name: string } | { name: string }[] | null;
};

export const CATEGORIES = ["عمالة", "مياه وري", "أسمدة", "شتلات", "مبيدات", "معدات", "وقود", "صيانة", "نقل", "أخرى"];

export function useData() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState("");
  const [farms, setFarms] = useState<Farm[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace("/login"); return; }

    const { data: mem, error: memErr } = await supabase
      .from("organization_members")
      .select("organization_id, role, organizations(name)")
      .eq("user_id", userData.user.id)
          .order("organization_id", { ascending: true })
    .limit(1);
    if (memErr) { setError(memErr.message); setLoading(false); return; }

    const m = (mem as unknown as Membership[] | null)?.[0];
    if (!m) { setOrgId(null); setLoading(false); return; }

    const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
    setOrgId(m.organization_id);
    setOrgName(org?.name ?? "");
    setRole(m.role);

    const [f, e, b] = await Promise.all([
      supabase.from("farms").select("id, name, location").eq("organization_id", m.organization_id).order("created_at"),
      supabase.from("expenses").select("id, farm_id, expense_date, category, description, amount, currency")
        .eq("organization_id", m.organization_id).order("expense_date", { ascending: false }),
      supabase.from("farm_budgets").select("farm_id, monthly_budget").eq("organization_id", m.organization_id),
    ]);
    if (f.error || e.error) setError((f.error ?? e.error)!.message);
    setExpenses((e.data as Expense[]) ?? []);
    setFarms((f.data as Farm[]) ?? []);
    setBudgets(Object.fromEntries(((b.data as { farm_id: string; monthly_budget: number }[]) ?? []).map((x) => [x.farm_id, Number(x.monthly_budget)])));
    setLoading(false);
  }, [router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  return { loading, orgId, orgName, role, farms, expenses, budgets, error, setError, load, signOut };
}