"use client";

// Every admin action – and each writes its line in the admin log. No admin component changes data any other way.
import { setPlatformPhase } from "@/config/platform";
import { day, eur } from "@/lib/i18n/adminFormat";
import { getCurrentUser, useStore } from "@/lib/store";
import { NotifyEvent, notify } from "@/lib/notify";
import * as email from "@/lib/notify/channels/email";
import type { ApplicationStatus, HostTier, HostApplication, PlatformPhase, SupportTicket, TicketStatus } from "@/lib/types";
import { addMarketingContact, deleteMarketingContact, patchMarketingContact, setMarketingClips, setMarketingStep } from "./store";
import { appendAdminLog, patchApplication, patchTaxQuestion, setBacklog, setFundingDoc, setFundingMoved, setLocation, patchTicket, setReceipt, setTaskState, pushWithdrawal, setApplicationStatus } from "./store";
import type { MarketingContact, TaxQuestion } from "@/lib/data";

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
      appendAdminLog("payout_requested", `${eur(amount)} → ${account}`, by);
    },
    /** A private withdrawal from the company account, entered by hand (Qonto) – for "what's left in the company". */
    addWithdrawal(date: string, amount: number, note?: string) {
      pushWithdrawal({ date, amount, note });
      appendAdminLog("withdrawal_added", `${eur(amount)} · ${day(date)}`, by);
    },
    /** A tier by hand (Applications, Houses › Hosts) – for an application, or a host's account. */
    setApplicationTier(application: HostApplication, tier: HostTier) {
      if (application.hostTier === tier) return;
      patchApplication(application.id, { hostTier: tier });
      appendAdminLog("host_tier_changed", `${application.name} · ${tier}`, by);
    },
    setHostTier(user: { id: string; name: string; hostTier?: HostTier }, tier: HostTier) {
      if (user.hostTier === tier) return;
      store.setHostTier(user.id, tier);
      appendAdminLog("host_tier_changed", `${user.name} · ${tier}`, by);
    },
    /**
     * Early warning (Admin › Houses). Mock: only logged (the caller shows the toast). TODO(backend): "Hervorheben" moves the House up on
     * Explore for a while; "Warteliste informieren" mails the matching sign-ups (lib/notify); "Host erinnern" sends the host a nudge.
     */
    highlightHouse(stay: { title: string }) {
      appendAdminLog("house_highlighted", stay.title, by);
    },
    notifyWaitlist(stay: { title: string }, count: number) {
      appendAdminLog("waitlist_notified", `${stay.title} · ${count}`, by);
    },
    remindHost(stay: { title: string }, hostName: string) {
      appendAdminLog("host_reminded", `${hostName} · ${stay.title}`, by);
    },
    /** Houses › Host helfen: suggestions to the host (price, photos, text). Mock: only logged. */
    sendHostSuggestions(stay: { title: string }, hostName: string) {
      appendAdminLog("host_suggestions", `${hostName} · ${stay.title}`, by);
    },
    /** Houses › Ausweichen: suggest moving the dates or merging crews. Mock: only logged. */
    proposeAlternative(stay: { title: string }, hostName: string) {
      appendAdminLog("alternative_proposed", `${hostName} · ${stay.title}`, by);
    },
    /** Heute: a task done (it's gone) – `label` is how it reads in the log. */
    /** Geld › Steuern: a receipt for a cost (the mock keeps only the file name). */
    attachReceipt(receiptNo: string, fileName: string) {
      setReceipt(receiptNo, fileName);
      appendAdminLog("receipt_attached", `${receiptNo} · ${fileName}`, by);
    },
    /** Geld › Steuern: a question for the tax advisor – its status or its note. */
    updateTaxQuestion(question: TaxQuestion, patch: Partial<Pick<TaxQuestion, "status" | "note">>) {
      if (Object.entries(patch).every(([k, v]) => question[k as keyof TaxQuestion] === v)) return;
      patchTaxQuestion(question.id, patch);
      appendAdminLog("tax_question_updated", `${question.text}${patch.status ? ` · ${patch.status}` : ""}`, by);
    },
    /** Finanzierung › Bereitschaft: "Umzug erledigt, Firma im Ausland" by hand. */
    setMoved(moved: boolean) {
      setFundingMoved(moved);
      appendAdminLog("funding_moved", moved ? "erledigt" : "noch nicht", by);
    },
    /** Finanzierung › Unterlagen: a document's status. */
    setFundingDocStatus(key: string, label: string, status: "missing" | "inProgress" | "done") {
      setFundingDoc(key, status);
      appendAdminLog("funding_doc", `${label} · ${status}`, by);
    },
    /** System › Backlog: an item's status. */
    setBacklogStatus(id: string, title: string, status: "open" | "inProgress" | "done", statusLabel: string) {
      setBacklog(id, status);
      appendAdminLog("backlog_status", `${title} · ${statusLabel}`, by);
    },
    /** Marketing › Plan: a next step ticked off (or back). */
    setMarketingStep(id: string, text: string, done: boolean) {
      setMarketingStep(id, done);
      appendAdminLog("marketing_step", `${text} · ${done ? "erledigt" : "offen"}`, by);
    },
    /** Marketing › Kontakte: a new contact (the detail opens with it). */
    addMarketingContact(contact: Omit<MarketingContact, "id" | "createdAt">): MarketingContact {
      const added = addMarketingContact(contact);
      appendAdminLog("marketing_contact_added", added.name, by);
      return added;
    },
    /** Marketing › Kontakte: one field changed (`what` names it for the log, without personal values). */
    updateMarketingContact(contact: MarketingContact, patch: Partial<Omit<MarketingContact, "id" | "createdAt">>, what: string) {
      patchMarketingContact(contact.id, patch);
      appendAdminLog("marketing_contact_updated", `${patch.name ?? contact.name} · ${what}`, by);
    },
    /** Marketing › Kontakte: deleted for good (privacy) – the log keeps only that one was deleted, not who. */
    deleteMarketingContact(contact: MarketingContact) {
      deleteMarketingContact(contact.id);
      appendAdminLog("marketing_contact_deleted", contact.id, by);
    },
    /** Marketing › Content: the 2D series' clips made. */
    setMarketingClips(count: number) {
      setMarketingClips(count);
      appendAdminLog("marketing_clips", String(Math.max(0, count)), by);
    },
    /** Marketing › Kontakte: the CSV for one's own records. */
    logMarketingExport(count: number) {
      appendAdminLog("marketing_export", `${count} Kontakte`, by);
    },
    /** Vision › Standort: the chosen country and why. */
    decideLocation(country: string | null, reason: string) {
      setLocation({ country, reason });
      appendAdminLog("location_decided", country ?? "noch offen", by);
    },
    /** Geld › Steuern: an export was made (format · period). */
    logExport(label: string) {
      appendAdminLog("export_created", label, by);
    },
    completeTask(id: string, label: string) {
      setTaskState(id, { done: true });
      appendAdminLog("task_done", label, by);
    },
    /** Heute: "Später" – the task comes back on `until` (tomorrow). */
    snoozeTask(id: string, label: string, until: string) {
      setTaskState(id, { snoozedUntil: until });
      appendAdminLog("task_snoozed", `${label} · ${day(until)}`, by);
    },
    /** Heute › Geld: a nudge to the guest whose payment failed. Mock: only logged. TODO(backend): lib/notify payment_reminder. */
    remindGuest(name: string, houseTitle: string) {
      appendAdminLog("guest_reminded", `${name} · ${houseTitle}`, by);
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
