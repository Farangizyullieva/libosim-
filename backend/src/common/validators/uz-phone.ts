// +998 followed by a real mobile operator code (not just any 2 digits) and
// 7 more digits, e.g. +998901234567. Landline/regional codes (61-79 range)
// are deliberately excluded since OTP delivery requires an SMS-capable
// mobile number.
const UZ_MOBILE_OPERATOR_CODES = ['90', '91', '93', '94', '95', '97', '98', '99', '33', '88', '77', '78', '20', '50', '55'];
export const UZ_PHONE_REGEX = new RegExp(`^\\+998(${UZ_MOBILE_OPERATOR_CODES.join('|')})\\d{7}$`);
export const UZ_PHONE_MESSAGE = 'Phone must be a valid Uzbekistan mobile number, e.g. +998901234567';
