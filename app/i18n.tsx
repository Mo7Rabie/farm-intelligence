"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "ar" | "en";
export type Vars = Record<string, string | number>;

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
  "common.listSep": "، ",

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

  "exp.err.amount": "المبلغ غير صحيح",
  "exp.confirmDelete": "هل تريد حذف هذا المصروف؟",
  "exp.form.title": "تسجيل مصروف",
  "exp.form.submit": "تسجيل",
  "exp.addFarmFirst": "أضف مزرعة أولًا.",
  "exp.field.amount": "المبلغ (AED)",
  "exp.field.descriptionOptional": "وصف (اختياري)",
  "exp.edit.title": "تعديل المصروف",
  "exp.exportCsv": "تصدير CSV",
  "exp.filter.allCategories": "كل الفئات",
  "exp.filter.from": "من تاريخ",
  "exp.filter.to": "إلى تاريخ",
  "exp.filter.clear": "مسح الفلاتر",
  "exp.summary": "{n} سجل — الإجمالي: {total} AED",
  "exp.noMatch": "لا توجد بيانات مطابقة",
  "exp.showing": "عرض {a} من {b} مصروفات",
  "exp.showLess": "عرض أقل",
  "exp.showAll": "عرض الكل ({n})",
  "exp.col.date": "التاريخ",
  "exp.col.farm": "المزرعة",
  "exp.col.category": "الفئة",
  "exp.col.description": "الوصف",
  "exp.col.amount": "المبلغ",
  "exp.col.currency": "العملة",

  "imp.open": "استيراد من CSV / Excel",
  "imp.close": "إغلاق الاستيراد",
  "imp.hint": "الأعمدة المطلوبة: التاريخ (YYYY-MM-DD)، المزرعة، الفئة، المبلغ. والوصف اختياري. الحد الأقصى {n} صف. أسماء الفئات بالعربي أو الإنجليزي.",
  "imp.validLabel": "صفوف صالحة",
  "imp.invalidLabel": "صفوف بها أخطاء",
  "imp.line": "سطر {n}: {errs}",
  "imp.import": "استيراد {n} صف صالح",
  "imp.skipNote": "الصفوف التي بها أخطاء لن يتم استيرادها.",
  "imp.summary": "تم استيراد {ok} صف بنجاح، وتم تخطي {failed} صف بها أخطاء.",
  "imp.allDuplicates": "كل الصفوف مكررة، ولم يتم استيراد أي شيء",
  "imp.err.type": "الملف لازم يكون CSV أو XLSX",
  "imp.err.empty": "الملف فاضي",
  "imp.err.maxRows": "الحد الأقصى {n} صف",
  "imp.err.missingCols": "أعمدة ناقصة: {cols}",
  "imp.err.date": "تاريخ غير صحيح (الصيغة YYYY-MM-DD)",
  "imp.err.farm": "المزرعة غير موجودة",
  "imp.err.category": "فئة غير معروفة",
  "imp.err.amount": "مبلغ غير صحيح",
  "imp.err.noRows": "مفيش صفوف بيانات",
  "imp.err.size": "الملف أكبر من 2MB",
  "imp.err.read": "تعذّر قراءة الملف",

  "farms.title": "إدارة المزارع",
  "farms.add.title": "إضافة مزرعة",
  "farms.add.btn": "إضافة",
  "farms.field.name": "اسم المزرعة",
  "farms.field.location": "الموقع (اختياري)",
  "farms.list.title": "قائمة المزارع",
  "farms.empty": "لا توجد مزارع بعد",
  "farms.edit.title": "تعديل المزرعة",
  "farms.confirmDelete": "هل تريد حذف هذه المزرعة؟",
  "farms.err.hasExpenses": "لا يمكن حذف مزرعة عليها مصروفات. احذف مصروفاتها الأول.",
  "farms.err.budget": "الميزانية غير صحيحة",
  "farms.err.nameRequired": "اسم المزرعة مطلوب",
  "farms.budget.spent": "صُرف هذا الشهر {spent} من {budget} AED ({pct}%)",
  "farms.budget.none": "لا توجد ميزانية شهرية",
  "farms.budget.placeholder": "ميزانية شهرية (AED) ثم Enter",

  "budget.title": "إعداد الميزانية",
  "budget.approved": "الميزانية المعتمدة",
  "budget.actual": "المصروفات الفعلية",
  "budget.remaining": "المتبقي",
  "budget.details": "تفاصيل الميزانية",
  "budget.col.farm": "المزرعة",
  "budget.col.budget": "الميزانية",
  "budget.col.spent": "المصروف",
  "budget.col.left": "المتبقي",
  "budget.col.pct": "النسبة",
  "budget.hint": "لتعديل الميزانية الشهرية لكل مزرعة: صفحة المزارع.",

  "irr.title": "إدارة الري والمياه",
  "irr.stat.total": "إجمالي تكلفة الري (AED)",
  "irr.stat.month": "تكلفة الري هذا الشهر (AED)",
  "irr.stat.avg": "متوسط التكلفة الشهرية (AED)",
  "irr.monthly": "تكلفة الري الشهرية",
  "irr.noExpenses": "لا توجد مصروفات ري بعد",
  "irr.log": "سجل مصروفات الري",
  "irr.noRecords": "لا توجد سجلات",
} as const;

export type Key = keyof typeof ar;
export type TFn = (key: Key, vars?: Vars) => string;

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
  "common.listSep": ", ",

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

  "exp.err.amount": "Invalid amount",
  "exp.confirmDelete": "Do you want to delete this expense?",
  "exp.form.title": "Record an expense",
  "exp.form.submit": "Record",
  "exp.addFarmFirst": "Add a farm first.",
  "exp.field.amount": "Amount (AED)",
  "exp.field.descriptionOptional": "Description (optional)",
  "exp.edit.title": "Edit expense",
  "exp.exportCsv": "Export CSV",
  "exp.filter.allCategories": "All categories",
  "exp.filter.from": "From date",
  "exp.filter.to": "To date",
  "exp.filter.clear": "Clear filters",
  "exp.summary": "{n} record(s) — Total: {total} AED",
  "exp.noMatch": "No matching data",
  "exp.showing": "Showing {a} of {b} expenses",
  "exp.showLess": "Show less",
  "exp.showAll": "Show all ({n})",
  "exp.col.date": "Date",
  "exp.col.farm": "Farm",
  "exp.col.category": "Category",
  "exp.col.description": "Description",
  "exp.col.amount": "Amount",
  "exp.col.currency": "Currency",

  "imp.open": "Import from CSV / Excel",
  "imp.close": "Close import",
  "imp.hint": "Required columns: Date (YYYY-MM-DD), Farm, Category, Amount. Description is optional. Max {n} rows. Category names can be Arabic or English.",
  "imp.validLabel": "Valid rows",
  "imp.invalidLabel": "Rows with errors",
  "imp.line": "Line {n}: {errs}",
  "imp.import": "Import {n} valid row(s)",
  "imp.skipNote": "Rows with errors will not be imported.",
  "imp.summary": "Imported {ok} row(s) successfully, skipped {failed} row(s) with errors.",
  "imp.allDuplicates": "All rows are duplicates, nothing was imported",
  "imp.err.type": "File must be CSV or XLSX",
  "imp.err.empty": "The file is empty",
  "imp.err.maxRows": "Maximum {n} rows",
  "imp.err.missingCols": "Missing columns: {cols}",
  "imp.err.date": "Invalid date (format YYYY-MM-DD)",
  "imp.err.farm": "Farm not found",
  "imp.err.category": "Unknown category",
  "imp.err.amount": "Invalid amount",
  "imp.err.noRows": "No data rows",
  "imp.err.size": "File is larger than 2MB",
  "imp.err.read": "Could not read the file",

  "farms.title": "Farm management",
  "farms.add.title": "Add a farm",
  "farms.add.btn": "Add",
  "farms.field.name": "Farm name",
  "farms.field.location": "Location (optional)",
  "farms.list.title": "Farms list",
  "farms.empty": "No farms yet",
  "farms.edit.title": "Edit farm",
  "farms.confirmDelete": "Do you want to delete this farm?",
  "farms.err.hasExpenses": "You cannot delete a farm that has expenses. Delete its expenses first.",
  "farms.err.budget": "Invalid budget",
  "farms.err.nameRequired": "Farm name is required",
  "farms.budget.spent": "Spent this month {spent} of {budget} AED ({pct}%)",
  "farms.budget.none": "No monthly budget",
  "farms.budget.placeholder": "Monthly budget (AED), then press Enter",

  "budget.title": "Budget setup",
  "budget.approved": "Approved budget",
  "budget.actual": "Actual expenses",
  "budget.remaining": "Remaining",
  "budget.details": "Budget details",
  "budget.col.farm": "Farm",
  "budget.col.budget": "Budget",
  "budget.col.spent": "Spent",
  "budget.col.left": "Remaining",
  "budget.col.pct": "Percentage",
  "budget.hint": "To edit each farm's monthly budget, go to the Farms page.",

  "irr.title": "Irrigation & water management",
  "irr.stat.total": "Total irrigation cost (AED)",
  "irr.stat.month": "This month's irrigation cost (AED)",
  "irr.stat.avg": "Average monthly cost (AED)",
  "irr.monthly": "Monthly irrigation cost",
  "irr.noExpenses": "No irrigation expenses yet",
  "irr.log": "Irrigation expense log",
  "irr.noRecords": "No records",
};

const dicts: Record<Lang, Record<Key, string>> = { ar, en };

// Expense categories are stored in Arabic in the database; this only translates the display.
const CAT_EN: Record<string, string> = {
  "عمالة": "Labor",
  "مياه وري": "Water & irrigation",
  "أسمدة": "Fertilizers",
  "شتلات": "Seedlings",
  "مبيدات": "Pesticides",
  "معدات": "Equipment",
  "وقود": "Fuel",
  "صيانة": "Maintenance",
  "نقل": "Transport",
  "أخرى": "Other",
};

type Ctx = {
  lang: Lang;
  t: TFn;
  cat: (name: string) => string;
  catKey: (name: string) => string;
  toggle: () => void;
};

const LangContext = createContext<Ctx>({
  lang: "ar",
  t: (key) => ar[key],
  cat: (name) => name,
  catKey: (name) => name,
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

  const t = useCallback<TFn>(
    (key, vars) => {
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

  // Accepts an Arabic or English category name and returns the Arabic value stored in the database.
  const catKey = useCallback((name: string) => {
    const n = name.trim().toLowerCase();
    const hit = Object.entries(CAT_EN).find(([, v]) => v.toLowerCase() === n);
    return hit ? hit[0] : name.trim();
  }, []);

  return (
    <LangContext.Provider value={{ lang, t, cat, catKey, toggle }}>{children}</LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}