"use client";

// Every admin action – and each writes its line in the admin log. No admin component changes data any other way.
import { setPlatformPhase } from "@/config/platform";
import { getCurrentUser, useStore } from "@/lib/store";
import { NotifyEvent, notify } from "@/lib/notify";
import * as email from "@/lib/notify/channels/email";
import type { ApplicationStatus, HostApplication, PlatformPhase, SupportTicket, TicketStatus } from "@/lib/types";
import { appendAdminLog, patchTicket, pushWithdrawal, setApplicationStatus } from "./store";

export function useAdminActions() {
  const store = useStore();
  const by = getCurrentUser(store)?.id ?? "unknown";
  return {
    /** Yes / Maybe / No on an application. "Yes" makes the applicant a founding host; moving away from "Yes" takes it back. */
    decide(application: HostApplication, status: ApplicationStatus) {
      if (application.status === status) return;
      setApplicationStatus(application.id, status);
      appendAdminLog("application_decided", `${application.name} · ${status}`, by);
      if (application.userId && (status === "yes" || application.status === "yes")) {
        store.setFoundingHost(application.userId, status === "yes");
        if (status === "yes") appendAdminLog("founding_host_added", application.name, by);
      }
    },
    /**
     * An answer to a ticket: added to its replies, sent through lib/notify (in-app + email for an account, email only for a guest – in the
     * mock only logged), status "answered" (an idea keeps planned / done).
     */
    reply(ticket: SupportTicket, text: string) {
      const at = new Date().toISOString();
      patchTicket(ticket.id, (t) => ({ replies: [...t.replies, { id: `r-${Date.now().toString(36)}`, from: "admin", by, text, createdAt: at }], status: t.status === "planned" || t.status === "done" ? t.status : "answered" }));
      const line = `Simpulo replied: ${text.length > 80 ? `${text.slice(0, 79)}…` : text}`;
      if (ticket.userId) notify(ticket.userId, NotifyEvent.SupportReply, { key: "supportReply", values: {}, eventId: `support-${ticket.id}-${Date.now()}`, href: "/", text: line });
      else email.send(ticket.email, { subject: "Simpulo replied to your message", text, template: "notification" });
      appendAdminLog("ticket_replied", ticketLabel(ticket), by);
    },
    setTicketStatus(ticket: SupportTicket, status: TicketStatus) {
      if (ticket.status === status) return;
      patchTicket(ticket.id, () => ({ status }));
      appendAdminLog("ticket_status", `${ticketLabel(ticket)} · ${status}`, by);
    },
    setTicketTags(ticket: SupportTicket, tags: readonly string[]) {
      patchTicket(ticket.id, () => ({ tags }));
      appendAdminLog("ticket_tags", `${ticketLabel(ticket)} · ${tags.join(", ") || "–"}`, by);
    },
    setTicketNote(ticket: SupportTicket, adminNotes: string) {
      if (ticket.adminNotes === adminNotes) return;
      patchTicket(ticket.id, () => ({ adminNotes }));
      appendAdminLog("ticket_note", ticketLabel(ticket), by);
    },
    /** A duplicate wish: closed and pointing at the other ticket, whose votes grow by its own. */
    merge(ticket: SupportTicket, into: SupportTicket) {
      if (ticket.id === into.id || ticket.mergedInto) return;
      patchTicket(into.id, (t) => ({ votes: t.votes + ticket.votes }));
      patchTicket(ticket.id, () => ({ mergedInto: into.id, status: "closed" }));
      appendAdminLog("ticket_merged", `${ticketLabel(ticket)} → ${ticketLabel(into)}`, by);
    },
    /**
     * "Pay out now": Simpulo's balance to the bank account on file at Stripe – never anywhere else. Mock: only logged. TODO(phase 5): a server
     * Function calls stripe.payouts.create on the platform account (no destination given: Stripe pays the account on file).
     */
    payOutNow(amount: number, account: string) {
      appendAdminLog("payout_requested", `€${amount.toLocaleString("en-US")} → ${account}`, by);
    },
    /** A private withdrawal from the company account, entered by hand (Qonto) – for "what's left in the company". */
    addWithdrawal(date: string, amount: number, note?: string) {
      pushWithdrawal({ date, amount, note });
      appendAdminLog("withdrawal_added", `€${amount.toLocaleString("en-US")} · ${date}`, by);
    },
    /** The platform phase – the same storage as the Dev menu's switch; the page reloads with that phase's data. */
    changePhase(phase: PlatformPhase) {
      appendAdminLog("phase_changed", phase, by);
      setPlatformPhase(phase);
      window.location.reload();
    },
  };
}

/** "#t-12 · Idea" – how a ticket reads in the log. */
const ticketLabel = (ticket: SupportTicket) => `${ticket.id} · ${ticket.category}`;
