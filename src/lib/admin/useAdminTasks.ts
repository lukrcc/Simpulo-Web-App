"use client";

import { useMemo } from "react";
import { getPaymentIssues } from "@/lib/data";
import { adminTasks, doneAdminTasks, type AdminTask } from "./tasks";
import { useAdminInputs } from "./useAdminInputs";

/** Admin › Posteingang: the open tasks (also the side list's badge). */
export function useAdminTasks(): AdminTask[] {
  const inputs = useAdminInputs();
  const issues = useMemo(() => getPaymentIssues() ?? [], []);
  return adminTasks(inputs, issues);
}

/** Posteingang › Erledigt: the finished ones. */
export function useDoneAdminTasks(): AdminTask[] {
  const inputs = useAdminInputs();
  const issues = useMemo(() => getPaymentIssues() ?? [], []);
  return doneAdminTasks(inputs, issues);
}
