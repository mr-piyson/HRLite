// ---------------------------------------------------------------------------
// Employee domain layer
// Pure constants, enums and value objects. No Prisma, no I/O.
// ---------------------------------------------------------------------------

/** Document types an employee can present. */
export const DocumentType = {
  IQAMA: "IQAMA",
  PASSPORT: "PASSPORT",
  VISA: "VISA",
} as const
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType]

export const DocumentTypeLabel: Record<DocumentType, string> = {
  IQAMA: "Iqama",
  PASSPORT: "Passport",
  VISA: "Visa (NP)",
}

/** Supported currencies for hourly rate. */
export const Currency = {
  SAR: "SAR",
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
  INR: "INR",
  PHP: "PHP",
  EGP: "EGP",
  PKR: "PKR",
  BDT: "BDT",
  NPR: "NPR",
} as const
export type Currency = (typeof Currency)[keyof typeof Currency]

export const CurrencyLabel: Record<Currency, string> = {
  SAR: "SAR - Saudi Riyal",
  USD: "USD - US Dollar",
  EUR: "EUR - Euro",
  GBP: "GBP - British Pound",
  INR: "INR - Indian Rupee",
  PHP: "PHP - Philippine Peso",
  EGP: "EGP - Egyptian Pound",
  PKR: "PKR - Pakistani Rupee",
  BDT: "BDT - Bangladeshi Taka",
  NPR: "NPR - Nepalese Rupee",
}

export const CurrencySymbol: Record<Currency, string> = {
  SAR: "\uFDFC",
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  INR: "\u20B9",
  PHP: "\u20B1",
  EGP: "E\u00A3",
  PKR: "Rs",
  BDT: "\u09F3",
  NPR: "Rs",
}

/** A rate history entry (employee rate + currency effective from a date). */
export interface EffectiveRate {
  hourRate: number
  currency: string | null
  effectiveDate: string
}

/**
 * Resolve the rate in effect for a given date key (yyyy-mm-dd).
 *
 * Picks the history entry with the greatest `effectiveDate` <= `dateKey`;
 * entries are expected to be sorted by effectiveDate desc (tie-break on
 * createdAt desc). Falls back to the earliest entry when none predates the
 * date, or a zero rate when there is no history at all.
 */
export function effectiveRateFor(
  dateKey: string,
  history: readonly EffectiveRate[],
): EffectiveRate {
  if (history.length === 0) {
    return { hourRate: 0, currency: "SAR", effectiveDate: dateKey }
  }
  for (const entry of history) {
    if (entry.effectiveDate <= dateKey) return entry
  }
  return history[history.length - 1]
}
