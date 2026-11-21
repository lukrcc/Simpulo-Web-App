"use client";

// /contact – the contact form: the imprint's second direct way to reach Simpulo besides email (config/company.ts secondContact). One message,
// an email to answer to (signed in: prefilled), a name if you like; it lands in Admin › Posteingang as a question (lib/admin/store.ts
// addSupportTicket – the same as "Get help"), signed in also in Messages as "Simpulo Support".
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { Input, Textarea } from "@/components/ui/Input";
import { usePlatformPhase } from "@/config/platform";
import { addSupportTicket } from "@/lib/admin/store";
import { getCurrentUser, useStore } from "@/lib/store";
import { ticketContext } from "@/lib/support/feedback";

const MESSAGE_MAX = 2000;

export function ContactForm() {
  const t = useTranslations("contactForm");
  const store = useStore();
  const me = getCurrentUser(store);
  const phase = usePlatformPhase();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const address = email || me?.email || "";

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!e.currentTarget.checkValidity() || !message.trim()) return;
    const from = name.trim() ? `${name.trim()}: ` : "";
    addSupportTicket({ userId: me?.id, email: address.trim(), category: "question", message: `${from}${message.trim()}`.slice(0, MESSAGE_MAX), context: ticketContext(phase), attachments: [] });
    setSent(true);
  }

  if (sent) {
    return (
      <p role="status" data-contact-sent className="rounded-[20px] bg-(--card) px-5 py-4 text-body text-ink">
        {t("sent")}
      </p>
    );
  }
  return (
    <form data-contact-form onSubmit={submit} className="flex max-w-[560px] flex-col gap-5" noValidate={false}>
      <FormField label={t("name")}>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
      </FormField>
      <FormField label={t("email")}>
        <Input type="email" required value={address} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
      </FormField>
      <FormField label={t("message")}>
        <Textarea required rows={6} maxLength={MESSAGE_MAX} value={message} onChange={(e) => setMessage(e.target.value)} />
      </FormField>
      <div>
        <Button type="submit" disabled={!message.trim() || !address.trim()}>
          {t("send")}
        </Button>
      </div>
    </form>
  );
}
