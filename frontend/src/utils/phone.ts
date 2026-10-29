// Keep in sync with backend/src/common/validators/uz-phone.ts
const UZ_MOBILE_OPERATOR_CODES = ['90', '91', '93', '94', '95', '97', '98', '99', '33', '88', '77', '78', '20', '50', '55'];
export const UZ_PHONE_REGEX = new RegExp(`^\\+998(${UZ_MOBILE_OPERATOR_CODES.join('|')})\\d{7}$`);

export function isValidUzPhone(phone: string): boolean {
  return UZ_PHONE_REGEX.test(phone.trim());
}
