"use client";

import { useStore } from "@/lib/store";

/** Development only: switch the mock user (or log out) from a small pill in the corner. */
export function DevSwitcher() {
  const { users, currentUserId, login, logout } = useStore();
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <label className="glass fixed bottom-[calc(152px+env(safe-area-inset-bottom))] left-4 z-50 flex h-8 items-center gap-1.5 rounded-full px-3 text-xs md:bottom-4 md:left-16">
      <span className="font-semibold text-zinc-500">Dev</span>
      <select
        value={currentUserId ?? ""}
        onChange={(e) => (e.target.value ? login(e.target.value) : logout())}
        className="cursor-pointer bg-transparent font-medium text-ink outline-none"
        aria-label="Mock user"
      >
        <option value="">Logged out</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </label>
  );
}
