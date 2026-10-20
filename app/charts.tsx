"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

type Expense = { farm_id: string; expense_date: string; category: string; amount: number };
type Farm = { id: string; name: string };

const COLORS = ["#166534", "#16a34a", "#65a30d", "#ca8a04", "#b45309", "#0f766e", "#0369a1", "#7c3aed", "#be123c", "#52525b"];

function sumBy(expenses: Expense[], key: (e: Expense) => string) {
  const map = new Map<string, number>();
  for (const e of expenses) map.set(key(e), (map.get(key(e)) ?? 0) + Number(e.amount));
  return Array.from(map, ([name, total]) => ({ name, total }));
}

const fmt = (v: unknown) => `${Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })} AED`;

export default function Charts({ expenses, farms }: { expenses: Expense[]; farms: Farm[] }) {
  const monthly = sumBy(expenses, (e) => e.expense_date.slice(0, 7)).sort((a, b) => a.name.localeCompare(b.name));
  const byCategory = sumBy(expenses, (e) => e.category).sort((a, b) => b.total - a.total);
  const byFarm = sumBy(expenses, (e) => farms.find((f) => f.id === e.farm_id)?.name ?? "—").sort((a, b) => b.total - a.total);

  const card = "rounded-xl border border-zinc-200 p-4";

  return (
    <section className="mt-6 grid gap-4 md:grid-cols-2">
      <div className={card + " md:col-span-2"}>
        <p className="mb-3 font-medium">المصروفات الشهرية</p>
        <div dir="ltr" className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={fmt} />
              <Bar dataKey="total" fill="#166534" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={card}>
        <p className="mb-3 font-medium">توزيع المصروفات حسب الفئة</p>
        <div dir="ltr" className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byCategory} dataKey="total" nameKey="name" outerRadius={85}>
                {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={fmt} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={card}>
        <p className="mb-3 font-medium">مقارنة المزارع</p>
        <div dir="ltr" className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byFarm} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={110} />
              <Tooltip formatter={fmt} />
              <Bar dataKey="total" fill="#16a34a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
