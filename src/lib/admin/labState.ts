// Admin › Labore: the labs as they stand now – the start values of lib/admin/labs.ts with what was set by click in Admin (AdminData.labStates).
// One place for the rule "Einnahme nur mit zahlendem Käufer": a lab earns only while its test says ja to "zahlender Käufer?".
import { useMemo } from "react";
import type { AdminData } from "@/lib/data/adapter";
import { LABS, type Lab } from "./labs";
import { useAdminData } from "./store";

/** May this lab be set to "Einnahme"? Only when the test's paying buyer is ja. */
export const canEarn = (lab: Pick<Lab, "test">) => lab.test.payingBuyer === "yes";

/** The labs with the admin's clicks applied; a stored "Einnahme" without a paying buyer counts as "Test". */
export function labsWithState(states: AdminData["labStates"]): Lab[] {
  return LABS.map((lab) => {
    const s = states?.[lab.id];
    if (!s) return lab;
    const test = { ...lab.test, ...s.test };
    const status = s.status ?? lab.status;
    return { ...lab, test, status: status === "revenue" && test.payingBuyer !== "yes" ? "test" : status };
  });
}

export function useLabs(): Lab[] {
  const states = useAdminData().labStates;
  return useMemo(() => labsWithState(states), [states]);
}
