const currencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
});

const periodFormatter = new Intl.DateTimeFormat("tr-TR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("tr-TR");
}

/** DuesRecord/BudgetItem period alanları ayın 1'i UTC olarak saklanır — "Ocak 2026" biçiminde gösterir. */
export function formatPeriod(date: Date) {
  return periodFormatter.format(date);
}

/** <input type="month"> için "YYYY-AA" değeri. */
export function toMonthInputValue(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** <input type="date"> için "YYYY-AA-GG" değeri. */
export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}
