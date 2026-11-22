"use client";

// Every admin action – and each writes its line in the admin log. No admin component changes data any other way.
import { setPlatformPhase } from "@/config/platform";
import { readPlatformPhase } from "@/lib/data";
import { HIGHLIGHT_POLICY, HOST_REFERRAL } from "@/config/policies";
import type { NudgeAudience } from "@/lib/houseHelp";
import { day, eur } from "@/lib/i18n/adminFormat";
import { getCurrentUser, useStore } from "@/lib/store";
import { notify, notifyByEmail } from "@/lib/notify";
import { tEn } from "@/lib/i18n/translate";
import { waitlistStatus } from "@/lib/types";
import type { ApplicationStatus, HostHelpItem, HostTier, HostApplication, PlatformPhase, Report, ReportOutcome, Stay, SupportTicket, TicketStatus } from "@/lib/types";
import { addContentHouse, addHouseAction, addTeamMessage, markNudged, addMarketingContact, addMarketingPartner, deleteMarketingContact, deleteMarketingPartner, patchMarketingContact, patchMarketingPartner, setHouseDone, setMarketingClips, setMarketingStep, patchRoadmapTodo, setRoadmapReached, addCostEntry, deleteCostEntry, setLaunchTask, addLaunchCustomTask, deleteLaunchCustomTask, addOwnTodo, patchRoadmapMilestone, addContentPost, patchContentPost, deleteContentPost } from "./store";
import { useAdminData } from "./store";
import { appendAdminLog, patchApplication, patchTaxQuestion, setBacklog, setLaunchCheck, setFundingDoc, setLocation, patchTicket, setReceipt, setTaskState, pushWithdrawal, setApplicationStatus } from "./store";
import type { ContentPost, CostEntry, MarketingContact, MarketingPartner, TaxQuestion } from "@/lib/data";

/** Reports opened in this visit (the log line once each). */
const viewedReports = new Set<string>();
const currentPhase = (): PlatformPhase => readPlatformPhase();

export function useAdminActions() {
  const store = useStore();
  const by = getCurrentUser(store)?.id ?? "unknown";
  const data = useAdminData();
  return {
    /**
     * Annehmen (yes) · Rückfrage (maybe) · Ablehnen (no) on an application – each into the log, each with an email to the applicant (mock: the
     * Dev menu's log). "Annehmen" makes the account a founding host (pre-launch: that unlocks Open a House – config/platform.ts
     * canOpenHouseAs); without an account the account with the same email is linked first. Moving away from "yes" takes it back.
     */
    decide(application: HostApplication, status: ApplicationStatus, question?: string) {
      if (application.status === status && status !== "maybe") return;
      const at = new Date().toISOString();
      const account = application.userId ?? (application.email ? store.users.find((u) => u.email?.toLowerCase() === application.email!.toLowerCase())?.id : undefined);
      setApplicationStatus(application.id, status);
      patchApplication(application.id, { ...(account && !application.userId && { userId: account }), ...(status === "yes" || status === "no" ? { decidedAt: at } : {}), ...(status === "maybe" && question ? { question: { text: question, at } } : {}) });
      appendAdminLog(status === "maybe" ? "application_question" : "application_decided", `${application.name} · ${status}`, by);
      if (account && (status === "yes" || application.status === "yes")) {
        store.setFoundingHost(account, status === "yes");
        if (status === "yes") appendAdminLog("founding_host_added", application.name, by);
      }
      // Host brings host (prepared, behind its switch): the accepted host was brought by the host whose link they came through.
      if (HOST_REFERRAL.enabled && account && status === "yes" && application.referredBy) store.setHostReferredBy(account, application.referredBy);
      const to = account ?? application.email ?? application.id;
      // The answer by email – the catalogue's entries (config/notifications.ts); the question itself is the body.
      if (status === "yes") notifyByEmail(to, "applicationAccepted");
      else if (status === "no") notifyByEmail(to, "applicationDeclined");
      else if (status === "maybe" && question) notifyByEmail(to, "applicationQuestion", { body: question });
    },
    /** A report was opened in the Posteingang – the access goes into the log (once per report and visit). */
    viewReport(report: Report, detail: string) {
      if (viewedReports.has(report.id)) return;
      viewedReports.add(report.id);
      appendAdminLog("report_viewed", detail, by, report.stayId);
    },
    /**
     * Verwarnen · Aus dem House entfernen · Konto sperren · Unbegründet – the store applies it and tells both sides (lib/store.tsx
     * decideReport); the log keeps what and about whom.
     */
    moderate(report: Report, outcome: ReportOutcome, detail: string) {
      if (report.decision) return;
      store.decideReport(report.id, outcome);
      appendAdminLog("report_decided", `${detail} · ${outcome}`, by, report.stayId);
      // The statement of reasons to the person concerned (store) – in the log too.
      if (outcome !== "unfounded" && report.subjectId) appendAdminLog("notice_sent", `${detail} · ${outcome}`, by, report.stayId);
      // The form without an account: the result goes to the email given (with an account the store's notification does it).
      if (report.reporterEmail && !report.reporterId) {
        const key = outcome === "unfounded" ? "reportUnfounded" : "reportActioned";
        notifyByEmail(report.reporterEmail, "reportDecided", { text: tEn(`messages.notify.${key}`) });
      }
    },
    /** A widerspruch: it stands or it's granted (the store undoes what it can and tells the person) – into the log. */
    decideAppeal(noticeId: string, outcome: "upheld" | "reversed", detail: string) {
      store.decideAppeal(noticeId, outcome);
      appendAdminLog("appeal_decided", `${detail} · ${outcome}`, by);
    },
    /**
     * An answer to a ticket: added to its replies, sent through lib/notify (in-app + email for an account, email only for a guest – in the
     * mock only logged), status "answered" (an idea keeps planned / done).
     */
    reply(ticket: SupportTicket, text: string) {
      const at = new Date().toISOString();
      patchTicket(ticket.id, (t) => ({ replies: [...t.replies, { id: `r-${Date.now().toString(36)}`, from: "admin", by, text, createdAt: at }], status: t.status === "planned" || t.status === "done" ? t.status : "answered" }));
      const line = `Simpulo replied: ${text.length > 80 ? `${text.slice(0, 79)}…` : text}`;
      if (ticket.userId) notify(ticket.userId, "supportReply", { key: "supportReply", values: {}, eventId: `support-${ticket.id}-${Date.now()}`, href: "/messages?id=support", text: line });
      else notifyByEmail(ticket.email, "supportReply", { body: text });
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
    /**
     * Houses › Sichtbarkeit: "Im Explore hervorheben" – the House moves up in Explore's default order for HIGHLIGHT_POLICY.days (as if it
     * started HIGHLIGHT_POLICY.rankShiftDays earlier); at most HIGHLIGHT_POLICY.maxConcurrent at once (the button says so before). Logged.
     */
    highlightHouse(stay: Stay) {
      const until = new Date(Date.now() + HIGHLIGHT_POLICY.days * 86_400_000).toISOString();
      store.boostHouse(stay.id, until);
      addHouseAction({ stayId: stay.id, lever: "visibility", at: new Date().toISOString(), filledAt: stay.spotsFilled, total: stay.spotsTotal });
      appendAdminLog("house_highlighted", `${stay.title} · bis ${day(until)}`, by, stay.id);
    },
    /**
     * Houses › Nachfrage: "Passende Leute benachrichtigen" – the audience of lib/houseHelp.ts nudgeAudience (consent given, nobody twice a day):
     * accounts through notify() (catalogue "houseNudge": push + the daily bundle), waitlist sign-ups without an account by email. Mock: the
     * Dev menu's log. Logged with how many were reached.
     */
    nudgeHouse(stay: Stay, audience: NudgeAudience, today: string) {
      const keys = [...new Set([...audience.waitlist, ...audience.inFor, ...audience.saved])];
      const house = stay.shortName ?? stay.title;
      for (const key of keys) {
        const user = store.users.find((u) => u.id === key);
        if (user) notify(user.id, "houseNudge", { house, url: `/house/${stay.slug}`, prefs: user.settings?.notifications });
        else notifyByEmail(key, "houseNudge", { house, url: `/house/${stay.slug}` });
      }
      markNudged(keys, today);
      addHouseAction({ stayId: stay.id, lever: "demand", at: new Date().toISOString(), filledAt: stay.spotsFilled, total: stay.spotsTotal, reached: keys.length });
      appendAdminLog("waitlist_notified", `${stay.title} · ${keys.length}`, by, stay.id);
    },
    remindHost(stay: { id?: string; title: string }, hostName: string) {
      appendAdminLog("host_reminded", `${hostName} · ${stay.title}`, by, stay.id);
    },
    /**
     * Houses › Host helfen: the message (from the template, as edited) to the host as "Simpulo Support" in Messages, and the tips that follow
     * from the comparison as a checklist in the host's Manage tab (Stay.hostHelp). Logged.
     */
    sendHostSuggestions(stay: Stay, text: string, items: HostHelpItem[]) {
      const host = store.users.find((u) => u.id === stay.hostId);
      if (!host) return;
      addTeamMessage({ userId: host.id, email: host.email ?? "", text, by, stayId: stay.id, phase: currentPhase() });
      notify(host.id, "teamMessage", { house: stay.shortName ?? stay.title, url: "/messages?id=support", prefs: host.settings?.notifications });
      store.setHostHelp(stay.id, items);
      addHouseAction({ stayId: stay.id, lever: "host", at: new Date().toISOString(), filledAt: stay.spotsFilled, total: stay.spotsTotal });
      appendAdminLog("host_suggestions", `${host.name.split(" ")[0]} · ${stay.title}`, by, stay.id);
    },
    /**
     * Houses › Ausweichen: only a suggestion to the host(s) – move the dates or join a similar House – as "Simpulo Support"; nothing changes
     * by itself (guests would have to agree or are refunded – the message says so). Logged.
     */
    proposeAlternative(stay: Stay, text: string, otherHostId?: string) {
      for (const id of [stay.hostId, ...(otherHostId && otherHostId !== stay.hostId ? [otherHostId] : [])]) {
        const host = store.users.find((u) => u.id === id);
        if (!host) continue;
        addTeamMessage({ userId: host.id, email: host.email ?? "", text, by, stayId: stay.id, phase: currentPhase() });
        notify(host.id, "teamMessage", { house: stay.shortName ?? stay.title, url: "/messages?id=support", prefs: host.settings?.notifications });
      }
      addHouseAction({ stayId: stay.id, lever: "alternative", at: new Date().toISOString(), filledAt: stay.spotsFilled, total: stay.spotsTotal });
      appendAdminLog("alternative_proposed", stay.title, by, stay.id);
    },
    /** Houses › "✓ Erledigt": out of "Braucht Hilfe" until it comes back without getting better. */
    markHouseDone(stay: { id: string; title: string; spotsFilled: number }) {
      setHouseDone(stay.id, stay.spotsFilled);
      appendAdminLog("house_done", stay.title, by, stay.id);
    },
    /** Houses › Läuft gut: ask the host for a quote (for Marketing). Mock: only logged. */
    askHostQuote(stay: Stay, hostName: string) {
      addHouseAction({ stayId: stay.id, lever: "quote", at: new Date().toISOString(), filledAt: stay.spotsFilled, total: stay.spotsTotal });
      appendAdminLog("host_quote_asked", `${hostName} · ${stay.title}`, by, stay.id);
    },
    /** Houses › Läuft gut: put the House aside for Marketing › Content. */
    markForContent(stay: Stay) {
      addContentHouse(stay.id);
      addHouseAction({ stayId: stay.id, lever: "content", at: new Date().toISOString(), filledAt: stay.spotsFilled, total: stay.spotsTotal });
      appendAdminLog("content_marked", stay.title, by, stay.id);
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
    /** Finanzierung › Unterlagen: a document's status. */
    setFundingDocStatus(key: string, label: string, status: "missing" | "inProgress" | "done") {
      setFundingDoc(key, status);
      appendAdminLog("funding_doc", `${label} · ${status}`, by);
    },
    /** System › Backlog: an item's status. */
    setBacklogStatus(id: string, title: string, status: "open" | "inProgress" | "done" | "parked", statusLabel: string) {
      setBacklog(id, status);
      appendAdminLog("backlog_status", `${title} · ${statusLabel}`, by);
    },
    /** System › Launch: a point confirmed by hand (or taken back). */
    confirmLaunchCheck(id: string, label: string, confirmed: boolean) {
      setLaunchCheck(id, confirmed ? new Date().toISOString() : null);
      appendAdminLog("launch_check", `${label} · ${confirmed ? "bestätigt" : "zurückgenommen"}`, by);
    },
    /** Geld › Kosten: a cost entered or removed (logged with amount and category). */
    addCostEntry(entry: Omit<CostEntry, "id">, label: string) {
      addCostEntry(entry);
      appendAdminLog("cost_entry", `${label} · ${entry.amount} € · ${entry.date}${entry.recurring ? " · monatlich" : ""}`, by);
    },
    deleteCostEntry(entry: CostEntry, label: string) {
      deleteCostEntry(entry.id);
      appendAdminLog("cost_entry", `${label} · ${entry.amount} € · entfernt`, by);
    },
    /** System › Zeitplan & Vorbereitung: a to-do's status (logged with the new status). */
    setRoadmapTodoStatus(id: string, title: string, status: "open" | "inProgress" | "done" | "later", label: string) {
      patchRoadmapTodo(id, { status });
      appendAdminLog("roadmap_todo", `${title} · ${label}`, by);
    },
    /** System › Zeitplan & Vorbereitung: a to-do's note or cost (logged without the value). */
    setRoadmapTodoField(id: string, title: string, field: "note" | "cost", value: string, label: string) {
      patchRoadmapTodo(id, { [field]: value });
      appendAdminLog("roadmap_todo", `${title} · ${label}`, by);
    },
    /** System › Zeitplan & Vorbereitung: a code milestone reached (or back). */
    setRoadmapReached(id: string, label: string, reached: boolean) {
      setRoadmapReached(id, reached);
      appendAdminLog("roadmap_milestone", `${label} · ${reached ? "erreicht" : "zurückgenommen"}`, by);
    },
    /** Zeitplan › Meilensteine: postponed (or back) and the note (logged without its text). */
    setMilestonePostponed(id: string, label: string, postponed: boolean) {
      patchRoadmapMilestone(id, { postponed });
      appendAdminLog("roadmap_milestone", `${label} · ${postponed ? "verschoben" : "nicht mehr verschoben"}`, by);
    },
    setMilestoneNote(id: string, label: string, note: string) {
      patchRoadmapMilestone(id, { note });
      appendAdminLog("roadmap_milestone", `${label} · Notiz`, by);
    },
    /** Zeitplan › To-dos: an own to-do added (logged with its due day). */
    addOwnTodo(text: string, due: string, week: string, group: string) {
      addOwnTodo(text, due, week, group);
      appendAdminLog("roadmap_todo", `${text} · neu · fällig ${due}`, by);
    },
    /** A due milestone whose to-dos are all done (logged once, when the last one is ticked). */
    logRoadmapMilestone(label: string) {
      appendAdminLog("roadmap_milestone", `${label} · erreicht`, by);
    },
    /** Marketing › Countdown: a task ticked off or back ("<week's first day>:<id>"). */
    setLaunchTask(key: string, text: string, done: boolean) {
      setLaunchTask(key, done);
      appendAdminLog("launch_task", `${text} · ${done ? "erledigt" : "offen"}`, by);
    },
    addLaunchTask(week: string, text: string) {
      addLaunchCustomTask(week, text);
      appendAdminLog("launch_task", `${text} · neu`, by);
    },
    deleteLaunchTask(id: string, text: string) {
      deleteLaunchCustomTask(id);
      appendAdminLog("launch_task", `${text} · entfernt`, by);
    },
    /** Marketing › Content: a short planned, published, moved or removed. */
    addContentPost(post: Omit<ContentPost, "id">) {
      const added = addContentPost(post);
      appendAdminLog("content_post", `${post.date} · ${post.title} · geplant`, by);
      return added;
    },
    updateContentPost(post: ContentPost, patch: Partial<Omit<ContentPost, "id">>, what: string) {
      patchContentPost(post.id, patch);
      appendAdminLog("content_post", `${patch.date ?? post.date} · ${post.title} · ${what}`, by);
    },
    deleteContentPost(post: ContentPost) {
      deleteContentPost(post.id);
      appendAdminLog("content_post", `${post.date} · ${post.title} · entfernt`, by);
    },
    /** Marketing › Countdown: a phase task ticked off (or back). */
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
    /** Marketing › Partner: a partner from a contact ("Als Partner anlegen") – its data taken over, the contact linked back. */
    partnerFromContact(contact: MarketingContact): MarketingPartner {
      const added = addMarketingPartner({
        contactId: contact.id,
        name: contact.name,
        kind: contact.kind ?? "creator",
        ...(contact.motivation ? { motivation: contact.motivation } : {}),
        reach: contact.followers,
        channels: [contact.channel],
        ladder: 1,
        foundingHost: false,
        hostUserId: null,
        agreement: { sharePercent: 0, from: null, to: null, payoutAfterPaidStay: true, contentRights: "", collabPosts: false, contractUrl: "", status: "draft" },
        houseIds: [],
        content: { planned: 0, delivered: 0, approved: 0 },
        notes: [],
        nextStep: null,
      });
      appendAdminLog("partner_added", `${added.name} (aus Kontakt)`, by);
      return added;
    },
    /** Marketing › Partner: a new one by hand. */
    addPartner(partner: Omit<MarketingPartner, "id" | "refCode" | "createdAt">): MarketingPartner {
      const added = addMarketingPartner(partner);
      appendAdminLog("partner_added", added.name, by);
      return added;
    },
    /** Marketing › Partner: one part changed (`what` names it for the log). */
    updatePartner(partner: MarketingPartner, patch: Partial<Omit<MarketingPartner, "id" | "refCode" | "createdAt">>, what: string) {
      patchMarketingPartner(partner.id, patch);
      appendAdminLog("partner_updated", `${patch.name ?? partner.name} · ${what}`, by);
    },
    /** Marketing › Partner › Verlauf: a dated note. */
    addPartnerNote(partner: MarketingPartner, text: string) {
      const note = { id: `${partner.id}-n${Date.now().toString(36)}`, at: new Date().toISOString(), text };
      patchMarketingPartner(partner.id, { notes: [note, ...partner.notes] });
      appendAdminLog("partner_note", partner.name, by);
    },
    /** Marketing › Partner: deleted for good (privacy) – the log keeps only the id. */
    deletePartner(partner: MarketingPartner) {
      deleteMarketingPartner(partner.id);
      appendAdminLog("partner_deleted", partner.id, by);
    },
    logPartnerExport(count: number) {
      appendAdminLog("partner_export", `${count} Partner`, by);
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
      // Live: everyone confirmed on the waitlist hears that Houses are open (catalogue "waitlistOpen") – accounts in the app and by email,
      // the rest by email. Mock: the Dev menu's log.
      if (phase === "live") {
        const confirmed = data.waitlist.filter((e) => waitlistStatus(e) === "confirmed");
        for (const entry of confirmed) {
          const account = entry.userId ? store.users.find((u) => u.id === entry.userId) : undefined;
          if (account) notify(account.id, "waitlistOpen", { key: "waitlistOpen", values: {}, eventId: `waitlist-open-${entry.id}`, href: "/explore", text: tEn("messages.notify.waitlistOpen"), url: "/explore", prefs: account.settings?.notifications });
          else notifyByEmail(entry.email, "waitlistOpen", { url: "/explore" });
        }
        appendAdminLog("waitlist_notified", `Launch · ${confirmed.length}`, by);
      }
      setPlatformPhase(phase);
      // A moment for the store to keep the new notices before the page loads again.
      window.setTimeout(() => window.location.reload(), 300);
    },
  };
}

/** "#t-12 · Idea" – how a ticket reads in the log. */
const ticketLabel = (ticket: SupportTicket) => `${ticket.id} · ${ticket.category}`;
