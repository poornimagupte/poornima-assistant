import type { ExpenseCategory, ExpenseMethod } from "@/lib/types";

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  groceries: "Groceries",
  eating_out: "Eating out",
  transport: "Transport",
  household: "Household",
  shopping: "Shopping",
  health: "Health",
  kids: "Kids",
  kids_fees: "Kids fees",
  entertainment: "Entertainment",
  staff: "Staff payment",
  subscriptions: "Subscriptions",
  other: "Other",
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];

export const METHOD_LABELS: Record<ExpenseMethod, string> = {
  upi: "UPI",
  cash: "Cash",
  card: "Card",
  bank: "Bank",
  other: "Other",
};

export const METHODS = Object.keys(METHOD_LABELS) as ExpenseMethod[];

export const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
