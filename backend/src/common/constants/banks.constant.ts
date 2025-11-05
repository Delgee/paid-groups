/**
 * Mongolian Bank Codes
 *
 * These are the official 6-digit bank codes used in Mongolia's banking system.
 * Used for QPay payment integration and bank account identification.
 */

export interface Bank {
  code: string;
  name: string;
}

export const MONGOLIAN_BANKS: Bank[] = [
  { code: '010000', name: 'Монголбанк' },
  { code: '210000', name: 'Ариг банк' },
  { code: '380000', name: 'Богд банк' },
  { code: '150000', name: 'Голомт банк' },
  { code: '300000', name: 'Капитрон банк' },
  { code: '390000', name: 'М банк' },
  { code: '340000', name: 'Төрийн банк' },
  { code: '190000', name: 'Тээвэр хөгжлийн банк' },
  { code: '290000', name: 'Үндэсний хөрөнгө оруулалтын банк' },
  { code: '050000', name: 'Хаан банк' },
  { code: '320000', name: 'Хас банк' },
  { code: '360000', name: 'Хөгжлийн банк' },
  { code: '040000', name: 'Худалдаа хөгжлийн банк' },
  { code: '330000', name: 'Чингис хаан банк' },
  { code: '030000', name: 'Капитал банк ЭХА' },
  { code: '180000', name: 'Хадгаламж банк ЭХА' },
];

/**
 * Get bank name by code
 */
export function getBankName(code: string): string | undefined {
  return MONGOLIAN_BANKS.find((bank) => bank.code === code)?.name;
}

/**
 * Validate bank code
 */
export function isValidBankCode(code: string): boolean {
  return MONGOLIAN_BANKS.some((bank) => bank.code === code);
}

/**
 * Get all bank codes
 */
export function getBankCodes(): string[] {
  return MONGOLIAN_BANKS.map((bank) => bank.code);
}
