"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "ar" | "en";
type Vars = Record<string, string | number>;

const ar = {
  "nav.dashboard": "لوحة التحكم",
  "nav.farms": "المزارع",
  "nav.expenses": "المصروفات",
  "nav.budget": "الميزانية",
  "nav.irrigation": "الري والمياه",
  "nav.labor": "العمالة والمهام",
  "nav.tasks": "المهام",
  "nav.inventory": "المخزون",
  "nav.productivity": "الإنتاجية",
  "nav.reports": "التقارير",
  "nav.members": "إدارة الأعضاء",
  "nav.settings": "الإعدادات",
  "nav.menu": "القائمة",
  "nav.close": "إغلاق",
  "lang.switch": "English",

  "common.loading": "جار التحميل...",
  "common.save": "حفظ",
  "common.saving": "جارٍ الحفظ...",
  "common.cancel": "إلغاء",
  "common.edit": "تعديل",
  "common.delete": "حذف",
  "common.actions": "إجراءات",

  "role.owner": "مالك",
  "role.farm_manager": "مدير مزرعة",
  "role.accountant": "محاسب",
  "role.supervisor": "مشرف",
  "role.analyst": "محلل",
  "role.viewer": "مشاهد",

  "dash.signOut": "تسجيل الخروج",
  "dash.createOrg.title": "أنشئ مؤسستك الأولى",
  "dash.createOrg.name": "اسم المؤسسة",
  "dash.createOrg.btn": "إنشاء",
  "dash.stat.farms": "عدد المزارع",
  "dash.stat.total": "إجمالي المصروفات (AED)",
  "dash.stat.month": "مصروفات هذا الشهر (AED)",
  "dash.stat.records": "عدد السجلات",
  "dash.recent": "أحدث المصروفات",
  "dash.viewAll": "عرض الكل",
  "dash.noExpenses": "لا توجد مصروفات بعد",
  "dash.col.date": "التاريخ",
  "dash.col.farm": "المزرعة",
  "dash.col.category": "الفئة",
  "dash.col.amount": "المبلغ",
  "chart.monthly": "المصروفات الشهرية",
  "chart.byCategory": "توزيع المصروفات حسب الفئة",
  "chart.byFarm": "مقارنة المزارع",

  "tasks.new": "+ مهمة جديدة",
  "tasks.alert.overdue": "تنبيه: يوجد {n} مهمة متأخرة",
  "tasks.alert.dueToday": "تنبيه: يوجد {n} مهمة مستحقة اليوم",
  "tasks.stat.total": "إجمالي المهام",
  "tasks.stat.completed": "مكتملة",
  "tasks.stat.inProgress": "قيد التنفيذ",
  "tasks.stat.overdue": "متأخرة",
  "tasks.form.new": "مهمة جديدة",
  "tasks.form.edit": "تعديل مهمة",
  "tasks.field.title": "عنوان المهمة",
  "tasks.field.description": "وصف المهمة",
  "tasks.field.chooseFarm": "اختر المزرعة",
  "tasks.field.noAssignee": "بدون مسؤول",
  "tasks.field.startDate": "تاريخ البدء",
  "tasks.field.dueDate": "تاريخ الاستحقاق",
  "tasks.field.notes": "ملاحظات",
  "tasks.filter.allFarms": "كل المزارع",
  "tasks.filter.allStatuses": "كل الحالات",
  "tasks.filter.allPriorities": "كل الأولويات",
  "tasks.filter.dueFrom": "استحقاق من",
  "tasks.filter.dueTo": "استحقاق إلى",
  "tasks.col.task": "المهمة",
  "tasks.col.farm": "المزرعة",
  "tasks.col.assignee": "المسؤول",
  "tasks.col.due": "الاستحقاق",
  "tasks.col.priority": "الأولوية",
  "tasks.col.status": "الحالة",
  "tasks.badge.today": "اليوم",
  "tasks.member": "عضو",
  "tasks.empty": "لا توجد مهام",
  "tasks.err.title": "عنوان المهمة مطلوب",
  "tasks.err.dates": "تاريخ الاستحقاق لا يمكن أن يسبق تاريخ البدء",
  "tasks.confirmDelete": "هل تريد حذف هذه المهمة؟",
  "tasks.prio.low": "منخفضة",
  "tasks.prio.medium": "متوسطة",
  "tasks.prio.high": "عالية",
  "tasks.prio.urgent": "عاجلة",
  "tasks.status.new": "جديدة",
  "tasks.status.in_progress": "قيد التنفيذ",
  "tasks.status.completed": "مكتملة",
  "tasks.status.cancelled": "ملغاة",
} as const;

export type Key = keyof typeof ar;

const en: Record<Key, string> = {
  "nav.dashboard": "Dashboard",
  "nav.farms": "Farms",
  "nav.expenses": "Expenses",
  "nav.budget": "Budget",
  "nav.irrigation": "Irrigation & Water",
  "nav.labor": "Labor & Tasks",
  "nav.tasks": "Tasks",
  "nav.inventory": "Inventory",
  "nav.productivity": "Productivity",
  "nav.reports": "Reports",
  "nav.members": "Members",
  "nav.settings": "Settings",
  "nav.menu": "Menu",
  "nav.close": "Close",
  "lang.switch": "العربية",

  "common.loading": "Loading...",
  "common.save": "Save",
  "common.saving": "Saving...",
  "common.cancel": "Cancel",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.actions": "Actions",

  "role.owner": "Owner",
  "role.farm_manager": "Farm manager",
  "role.accountant": "Accountant",
  "role.supervisor": "Supervisor",
  "role.analyst": "Analyst",
  "role.viewer": "Viewer",

  "dash.signOut": "Sign out",
  "dash.createOrg.title": "Create your first organization",
  "dash.createOrg.name": "Organization name",
  "dash.createOrg.btn": "Create",
  "dash.stat.farms": "Farms",
  "dash.stat.total": "Total expenses (AED)",
  "dash.stat.month": "This month's expenses (AED)",
  "dash.stat.records": "Records",
  "dash.recent": "Latest expenses",
  "dash.viewAll": "View all",
  "dash.noExpenses": "No expenses yet",
  "dash.col.date": "Date",
  "dash.col.farm": "Farm",
  "dash.col.category": "Category",
  "dash.col.amount": "Amount",
  "chart.monthly": "Monthly expenses",
  "chart.byCategory": "Expenses by category",
  "chart.byFarm": "Farm comparison",

  "tasks.new": "+ New task",
  "tasks.alert.overdue": "Alert: {n} overdue task(s)",
  "tasks.alert.dueToday": "Alert: {n} task(s) due today",
  "tasks.stat.total": "Total tasks",
  "tasks.stat.completed": "Completed",
  "tasks.stat.inProgress": "In progress",
  "tasks.stat.overdue": "Overdue",
  "tasks.form.new": "New task",
  "tasks.form.edit": "Edit task",
  "tasks.field.title": "Task title",
  "tasks.field.description": "Task description",
  "tasks.field.chooseFarm": "Select a farm",
  "tasks.field.noAssignee": "No assignee",
  "tasks.field.startDate": "Start date",
  "tasks.field.dueDate": "Due date",
  "tasks.field.notes": "Notes",
  "tasks.filter.allFarms": "All farms",
  "tasks.filter.allStatuses": "All statuses",
  "tasks.filter.allPriorities": "All priorities",
  "tasks.filter.dueFrom": "Due from",
  "tasks.filter.dueTo": "Due to",
  "tasks.col.task": "Task",
  "tasks.col.farm": "Farm",
  "tasks.col.assignee": "Assignee",
  "tasks.col.due": "Due",
  "tasks.col.priority": "Priority",
  "tasks.col.status": "Status",
  "tasks.badge.today": "Today",
  "tasks.member": "Member",
  "tasks.empty": "No tasks",
  "tasks.err.title": "Task title is required",
  "tasks.err.dates": "Due date cannot be before the start date",
  "tasks.confirmDelete": "Do you want to delete this task?",
  "tasks.prio.low": "Low",
  "tasks.prio.medium": "Medium",
  "tasks.prio.high": "High",
  "tasks.prio.urgent": "Urgent",
  "tasks.status.new": "New",
  "tasks.status.in_progress": "In progress",
  "tasks.status.completed": "Completed",
  "tasks.status.cancelled": "Cancelled",
};

const dicts: Record<Lang, Record<Key, string>> = { ar, en };

// Expense categories are stored in Arabic in the database; this only translates the display.
const CAT_EN: Record<string, string> = {
  "عمالة": "Labor",
  "مياه وري": "Water & irrigation",
  "أسمدة": "Fertilizers",
  "معدات": "Equipment",
  "وقود": "Fuel",
};

type Ctx = {
  lang: Lang;
  t: (key: Key, vars?: Vars) => string;
  cat: (name: string) => string;
  toggle: () => void;
};

const LangContext = createContext<Ctx>({
  lang: "ar",
  t: (key) => ar[key],
  cat: (name) => name,
  toggle: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang");
      if (saved === "en" || saved === "ar") setLang(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const toggle = useCallback(() => {
    const next: Lang = lang === "ar" ? "en" : "ar";
    setLang(next);
    try {
      localStorage.setItem("lang", next);
    } catch {}
  }, [lang]);

  const t = useCallback(
    (key: Key, vars?: Vars) => {
      let s: string = dicts[lang][key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.split(`{${k}}`).join(String(v));
        }
      }
      return s;
    },
    [lang],
  );

  const cat = useCallback(
    (name: string) => (lang === "en" ? (CAT_EN[name] ?? name) : name),
    [lang],
  );

  return <LangContext.Provider value={{ lang, t, cat, toggle }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}