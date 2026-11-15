// ⚠ MOCK: the kind of place each mock House is in (config/accommodation.ts), chosen to fit its title, text and photos – a villa where the
// text says villa, a chalet for the ski weekends, a sailboat for the sailing week. Founding and example Houses take their base House's.
import { accommodationOf } from "@/config/accommodation";

const TYPES: Readonly<Record<string, string>> = {
  s1: "villa", s2: "villa", s3: "house", s4: "training-camp", s5: "coliving", s6: "house", s7: "beach-house", s8: "villa", s9: "house",
  s10: "villa", s11: "villa", s12: "house", s13: "townhouse", s14: "house", s15: "large-apartment", s16: "serviced-apartments",
  s17: "guesthouse", s18: "villa", s19: "chalet", s20: "large-apartment", s21: "villa", s22: "large-apartment", s23: "villa", s24: "house",
  s25: "villa", s54: "large-apartment", s55: "house", s26: "large-apartment", s27: "townhouse", s28: "large-apartment", s29: "townhouse",
  s30: "villa", s31: "surf-camp", s32: "dive-center", s33: "eco-lodge", s34: "large-apartment", s35: "large-apartment",
  s36: "large-apartment", s37: "large-apartment", s38: "cabin", s39: "house", s40: "house", s41: "house", s42: "country-house",
  s43: "house", s44: "townhouse", s45: "chalet", s46: "large-apartment", s47: "house", s48: "house", s49: "chalet",
  s50: "large-apartment", s51: "large-apartment", s52: "house", s53: "villa",
  x1: "villa", x2: "penthouse", x3: "large-apartment", x4: "beach-house", x5: "house", x6: "house", x7: "finca", x8: "villa", x9: "finca",
  x10: "coliving", x11: "house", x12: "beach-house", x13: "house", x14: "serviced-apartments", x15: "large-apartment",
  x16: "large-apartment", x17: "guesthouse", x18: "glamping", x19: "house", x20: "villa", x21: "large-apartment", x22: "house",
  x23: "townhouse", x24: "large-apartment", x25: "large-apartment", x26: "large-apartment", x27: "chalet", x28: "surf-camp", x29: "house",
  x30: "dive-center", x31: "sailboat", x32: "climbing-lodge", x33: "house", x34: "cabin", x35: "guesthouse", x36: "large-apartment",
  x37: "training-camp", x38: "training-camp", x39: "retreat-center", x40: "mountain-hut", x41: "riad", x42: "large-apartment",
  x43: "house", x44: "manor", x45: "large-apartment", x46: "large-apartment", x47: "summer-student-housing", x48: "large-apartment",
  x49: "large-apartment", x50: "townhouse",
};

// Every id above must be a type in config/accommodation.ts.
for (const [id, type] of Object.entries(TYPES)) if (!accommodationOf(type)) throw new Error(`mock-accommodation: unknown type "${type}" for ${id}`);

/** A mock House's type by its id (or the base House's, for copies "s6-2", "f-…"); undefined when none is set. */
export const mockAccommodationType = (stayId: string, baseId?: string): string | undefined => TYPES[stayId] ?? (baseId ? TYPES[baseId] : undefined);
