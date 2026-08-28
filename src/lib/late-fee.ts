/** period ile asOf arasındaki tam ay sayısı (period ayı hariç — vade ayının bitiminden itibaren gecikme başlar). */
export function monthsOverdue(period: Date, asOf: Date): number {
  const months =
    (asOf.getUTCFullYear() - period.getUTCFullYear()) * 12 + (asOf.getUTCMonth() - period.getUTCMonth());
  return Math.max(0, months);
}

/**
 * Basit (bileşik olmayan) gecikme faizi: ödenmemiş anaparanın, oran ve gecikilen ay sayısıyla çarpımı.
 * `ratePercent` aylık yüzde orandır (örn. 5 → %5/ay).
 */
export function calculateLateFee(outstandingPrincipal: number, ratePercent: number, monthsLate: number): number {
  if (outstandingPrincipal <= 0 || ratePercent <= 0 || monthsLate <= 0) return 0;
  return Math.round(outstandingPrincipal * (ratePercent / 100) * monthsLate * 100) / 100;
}
