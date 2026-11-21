// "Download your data" (Settings › Privacy & safety › Your data, CLAUDE.md "Settings"): one file – a ZIP with data.json (everything,
// machine-readable) and overview.txt (the same in plain words). Profile, Houses (hosted and joined), bookings (requests and payments), your
// own messages, your agreements. Mock: built in the browser at once; TODO(backend): a job that emails the link when it's ready.
import { zip } from "./admin/exporters/zip";
import { consentsOf } from "./consent";
import type { StoreData } from "./store";
import type { JoinRequest, Payment, Thread, User } from "./types";

type Data = StoreData & { payments: readonly Payment[]; threads: readonly Thread[] };

export function buildDataExport(data: Data, me: User, now: Date) {
  const hosted = data.stays.filter((s) => s.hostId === me.id && !s.isExample);
  const requests: JoinRequest[] = data.joinRequests.filter((r) => r.userId === me.id);
  const joined = data.stays.filter((s) => requests.some((r) => r.stayId === s.id && r.status === "accepted"));
  const payments = data.payments.filter((p) => p.userId === me.id);
  const messages = data.threads.flatMap((t) => t.messages.filter((m) => m.senderId === me.id).map((m) => ({ chat: t.id, house: t.houseId ?? null, at: m.createdAt, text: m.text })));
  const consents = consentsOf(me);
  // The profile as you entered it – the settings' internals (mock caches) stay out, your choices go in.
  const { settings, ...profile } = me;
  const json = {
    exportedAt: now.toISOString(),
    profile,
    settings: { notifications: settings?.notifications, quietHours: settings?.quietHours, appearance: settings?.appearance, blockedUserIds: settings?.blockedUserIds, savedPeopleIds: settings?.savedPeopleIds },
    housesHosted: hosted.map((s) => ({ id: s.id, title: s.title, from: s.startDate, to: s.endDate, status: s.status })),
    housesJoined: joined.map((s) => ({ id: s.id, title: s.title, from: s.startDate, to: s.endDate })),
    requests: requests.map((r) => ({ house: r.stayId, status: r.status, at: r.createdAt, note: r.message || undefined })),
    payments: payments.map((p) => ({ house: p.stayId, share: p.share, fee: p.fee, total: p.total, status: p.status, paidAt: p.paidAt, refunded: p.refundedAmount })),
    messages,
    consents,
  };
  const title = (id: string) => data.stays.find((s) => s.id === id)?.title ?? id;
  const lines = [
    `Your Simpulo data – ${now.toISOString().slice(0, 10)}`,
    "",
    "PROFILE",
    `First name: ${me.name}`,
    ...(me.email ? [`Email: ${me.email}`] : []),
    `Country: ${me.country}`,
    ...(me.bio ? [`About: ${me.bio}`] : []),
    `Photos: ${me.photos.length}`,
    "",
    `HOUSES YOU HOSTED (${hosted.length})`,
    ...hosted.map((s) => `- ${s.title} · ${s.startDate} – ${s.endDate} · ${s.status}`),
    "",
    `HOUSES YOU JOINED (${joined.length})`,
    ...joined.map((s) => `- ${s.title} · ${s.startDate} – ${s.endDate}`),
    "",
    `REQUESTS (${requests.length})`,
    ...requests.map((r) => `- ${title(r.stayId)} · ${r.status} · ${r.createdAt.slice(0, 10)}`),
    "",
    `PAYMENTS (${payments.length})`,
    ...payments.map((p) => `- ${title(p.stayId)} · ${p.total} · ${p.status}${p.paidAt ? ` · paid ${p.paidAt.slice(0, 10)}` : ""}${p.refundedAmount ? ` · refunded ${p.refundedAmount}` : ""}`),
    "",
    `YOUR MESSAGES (${messages.length})`,
    ...messages.map((m) => `- ${m.at.slice(0, 16).replace("T", " ")} · ${m.house ? title(m.house) : m.chat}: ${m.text}`),
    "",
    `AGREEMENTS (${consents.length})`,
    ...consents.map((c) => `- ${c.kind}${c.version ? ` v${c.version}` : ""} · ${c.at.slice(0, 10)}`),
    "",
    "All of it, machine-readable: data.json",
  ];
  return zip([
    { name: "data.json", data: JSON.stringify(json, null, 2), date: now },
    { name: "overview.txt", data: lines.join("\n"), date: now },
  ]);
}
