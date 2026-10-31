"use client";

import { LogOut, Settings, Building2, UserRound, Sprout, Receipt, Wallet } from "lucide-react";
import { useData } from "../use-data";
import { useLang } from "../i18n";

export default function SettingsPage() {
  const { loading, orgName, role, farms, expenses, error, signOut } = useData();
  const { lang } = useLang();

  const isArabic = lang === "ar";

  const roles: Record<string, string> = isArabic
    ? {
        owner: "مالك المؤسسة",
        farm_manager: "مدير مزرعة",
        accountant: "محاسب",
        supervisor: "مشرف",
        analyst: "محلل",
        viewer: "مشاهد",
      }
    : {
        owner: "Organization Owner",
        farm_manager: "Farm Manager",
        accountant: "Accountant",
        supervisor: "Supervisor",
        analyst: "Analyst",
        viewer: "Viewer",
      };

  if (loading) {
    return (
      <p className="text-sm text-zinc-500">
        {isArabic ? "جارٍ التحميل..." : "Loading..."}
      </p>
    );
  }

  const rows = [
    {
      label: isArabic ? "اسم المؤسسة" : "Organization Name",
      value: orgName || "—",
      icon: Building2,
    },
    {
      label: isArabic ? "دورك في النظام" : "Your Role",
      value: roles[role] ?? (role || "—"),
      icon: UserRound,
    },
    {
      label: isArabic ? "عدد المزارع" : "Total Farms",
      value: String(farms.length),
      icon: Sprout,
    },
    {
      label: isArabic ? "عدد سجلات المصروفات" : "Expense Records",
      value: String(expenses.length),
      icon: Receipt,
    },
    {
      label: isArabic ? "العملة المستخدمة" : "Currency",
      value: "AED",
      icon: Wallet,
    },
  ];

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="space-y-6">

      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Settings size={22} className="text-emerald-700" />
          <h1 className="text-xl font-bold text-zinc-900">
            {isArabic ? "الإعدادات" : "Settings"}
          </h1>
        </div>

        <p className="text-sm text-zinc-500">
          {isArabic
            ? "عرض معلومات المؤسسة وحسابك وإعدادات النظام."
            : "View your organization, account information and system settings."}
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {/* Account Information */}
      <section className="max-w-2xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">

        <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <UserRound size={18} className="text-emerald-700" />
            <h2 className="font-semibold text-zinc-800">
              {isArabic ? "معلومات الحساب والمؤسسة" : "Account & Organization"}
            </h2>
          </div>

          <p className="mt-1 text-xs text-zinc-500">
            {isArabic
              ? "ملخص بيانات حسابك داخل النظام."
              : "A summary of your account information."}
          </p>
        </div>

        <dl className="divide-y divide-zinc-100 px-5">

          {rows.map((row) => {
            const Icon = row.icon;

            return (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 py-4"
              >
                <dt className="flex items-center gap-3 text-sm text-zinc-500">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Icon size={17} />
                  </span>
                  {row.label}
                </dt>

                <dd className="text-sm font-semibold text-zinc-800">
                  {row.value}
                </dd>
              </div>
            );
          })}

        </dl>
      </section>

      {/* System Information */}
      <section className="max-w-2xl rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 font-semibold text-zinc-800">
          {isArabic ? "معلومات النظام" : "System Information"}
        </h2>

        <p className="text-sm text-zinc-500">
          {isArabic
            ? "نظام Farm Intelligence لإدارة المزارع والعمليات الزراعية والمالية."
            : "Farm Intelligence system for managing farms, agricultural operations and financial activities."}
        </p>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3">
          <span className="text-sm text-zinc-500">
            {isArabic ? "الإصدار" : "Version"}
          </span>

          <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            MVP
          </span>
        </div>
      </section>

      {/* Logout */}
      <div className="max-w-2xl border-t border-zinc-200 pt-5">
        <button
          onClick={signOut}
          className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          <LogOut size={17} />
          {isArabic ? "تسجيل الخروج" : "Sign Out"}
        </button>
      </div>

    </div>
  );
}