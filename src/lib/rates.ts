import { convert, RATES_PER_EUR } from "./currency";

/** Kept for its callers: the rates and the conversion live in src/lib/currency.ts (mock, fixed against EUR). */
export { RATES_PER_EUR };
export const convertApprox = convert;
