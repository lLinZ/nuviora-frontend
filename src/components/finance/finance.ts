// src/components/finance/finance.ts
// Finanzas (Módulo 4 de Fran, 2026-10-12): tipos y utilidades de la pantalla de gastos (§24 a §33). Solo el Admin (§81).
export { api } from "../meta-ads/metaAds";
export { money, day, todayCaracas } from "../delivery-tariffs/deliveryTariffs";
export { download } from "../agency-closures/closures";

export type Currency = "USD" | "USDT" | "VES";
export type Frequency = "weekly" | "monthly" | "annual" | "custom";

export type Option = { id: number; name: string };

export type FinanceOptions = {
    categories: { id: number; name: string; is_active: boolean }[];
    products: { id: number; title: string }[];
    cities: Option[];
    warehouses: Option[];
    agencies: { id: number; names: string }[];
    suppliers: Option[];
    currencies: Currency[];
    frequencies: Record<Frequency, string>;
    weekdays: Record<string, string>;
};

export type Expense = {
    id: number; concept: string; expense_category_id: number; category: string | null;
    amount: number; currency: Currency; rate: number; amount_usd: number; expense_date: string; description: string | null;
    has_receipt: boolean; product_id: number | null; product: string | null; city_id: number | null; city: string | null;
    warehouse_id: number | null; warehouse: string | null; agency_id: number | null; agency: string | null;
    supplier_id: number | null; supplier: string | null; scope: "general" | "assigned";
    voided_at: string | null; voided_by: string | null; void_reason: string | null; created_by: string | null; created_at: string | null;
};

export type ExpensesResponse = {
    from: string; to: string; expenses: Expense[];
    summary: { total: number; manual: number; recurring: number; general: number; assigned: number; by_category: { category: string; amount_usd: number }[] };
};

export type RecurringVersion = {
    id: number; valid_from: string; is_active: boolean; amount: number; currency: Currency; rate: number; amount_usd: number; created_by: string | null;
};

export type RecurringExpense = {
    id: number; name: string; expense_category_id: number; category: string | null; frequency: Frequency; frequency_label: string;
    interval_days: number | null; payment_day: number | null; payment_date: string | null; schedule: string;
    product_id: number | null; product: string | null; city_id: number | null; city: string | null; scope: "general" | "assigned";
    is_active: boolean; active_today: boolean; current: RecurringVersion | null; scheduled: RecurringVersion | null;
    monthly_usd: number; next_payment: string | null; versions: RecurringVersion[];
};

export type AuditEntry = {
    id: number; action: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null;
    reason: string | null; user: string | null; at: string;
};

export const CURRENCY_LABEL: Record<Currency, string> = { USD: "Dólares (USD)", USDT: "USDT", VES: "Bolívares (Bs)" };

/** Lo que muestra el monto original: "Bs 5.000,00 a 100" o "$150,00". */
export const original = (amount: number, currency: Currency, rate: number) => {
    const n = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    if (currency === "VES") return `Bs ${n} (tasa ${new Intl.NumberFormat("es-VE", { maximumFractionDigits: 4 }).format(rate)})`;
    return currency === "USDT" ? `${n} USDT` : `$${n}`;
};

/** §31 a §33: el equivalente en USD que va a guardar el backend. */
export const toUsd = (amount: string, currency: Currency, rate: string): number | null => {
    const a = Number(amount.replace(",", "."));
    if (!Number.isFinite(a) || a <= 0) return null;
    if (currency !== "VES") return Math.round(a * 100) / 100;
    const r = Number(rate.replace(",", "."));
    return Number.isFinite(r) && r > 0 ? Math.round((a / r) * 100) / 100 : null;
};

export const num = (s: string) => Number(s.replace(",", "."));

/** Primer y último día de un mes, en AAAA-MM-DD. */
export const monthRange = (offset = 0): [string, string] => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return [ymd(first), ymd(last)];
};

/** El mensaje de error de una respuesta del backend (el primero de la validación, si lo hay). */
export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "No se pudo guardar.");
