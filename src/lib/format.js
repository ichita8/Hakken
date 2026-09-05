import { formatDistanceToNow } from "date-fns";

export const formatCurrency = (n) => {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
};

export const formatMoney = (n) => {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

export const formatSigned = (n) => {
  if (n == null || isNaN(n)) return "—";
  return (n >= 0 ? "+" : "") + formatMoney(n);
};

export const formatPct = (n) => `${(n || 0).toFixed(0)}%`;

export const formatPctSigned = (n) => `${n >= 0 ? "+" : ""}${(n || 0).toFixed(0)}%`;

export const timeAgo = (d) => {
  if (!d) return "—";
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true });
  } catch {
    return "—";
  }
};
