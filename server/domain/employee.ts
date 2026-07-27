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
