"use client";

import { useMemo } from "react";
import { getPaymentIssues } from "@/lib/data";
import { adminTasks, type AdminTask } from "./tasks";
import { useAdminInputs } from "./useAdminInputs";

/** Admin › Heute: the open tasks (also the side list's badge). */
export function useAdminTasks(): AdminTask[] {
  const inputs = useAdminInputs();
  const issues = useMemo(() => getPaymentIssues() ?? [], []);
  return adminTasks(inputs, issues);
}
