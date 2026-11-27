// Admin › Marketing › Akquise: the goal, the daily target and the start templates. The templates are English (they go to the people we write
// to) – short, an invitation, not a sale; editable in Admin (AdminData.acquisitionTemplates keeps the edited ones). {Name}, {Ort}, {Thema} are
// placeholders, highlighted in Admin and filled by hand.
import type { AcquisitionType } from "@/lib/acquisition";

/** Founding Hosts before the launch */
export const FOUNDING_GOAL = 100;
/** DMs a day (Akquise › Heute) */
export const DM_DAILY_TARGET = 20;

export type AcquisitionTemplateId = AcquisitionType | "whatsapp";
export const ACQUISITION_TEMPLATE_IDS: readonly AcquisitionTemplateId[] = ["nomad", "smallCreator", "bigCreator", "earningHost", "group", "whatsapp"];

export interface AcquisitionTemplate {
  /** Only the email template (Großer Creator) has a subject */
  subject: string | null;
  body: string;
}

const SIGN = "– Lukas, founder";
const FREE = "Free to open a House, no commitment.";

export const ACQUISITION_TEMPLATES: Readonly<Record<AcquisitionTemplateId, AcquisitionTemplate>> = {
  nomad: {
    subject: null,
    body: `Hey {Name}! Saw you're in {Ort} – I'm building Simpulo: you open a House for a few weeks and people who share your thing ({Thema}) join you.\n\nWould you like to be one of our first 100 Founding Hosts? ${FREE}\n\n${SIGN}`,
  },
  smallCreator: {
    subject: null,
    body: `Hey {Name}, love your {Thema} posts. I'm building Simpulo – live together for a few weeks with people who share your thing.\n\nI'd love you as a Founding Host: open a House in {Ort} and invite your people. ${FREE}\n\n${SIGN}`,
  },
  bigCreator: {
    subject: "A House for your community in {Ort}?",
    body: `Hi {Name},\n\nI'm Lukas, founder of Simpulo. People live together for a few weeks in a House, around one thing they love – for your community that could be {Thema} in {Ort}.\n\nWe're inviting 100 Founding Hosts before we open. You'd host, your people join, and you're on stage at the launch. ${FREE}\n\nUp for a 15-minute call?\n\n${SIGN}`,
  },
  earningHost: {
    subject: null,
    body: `Hi {Name}! You already host people – on Simpulo you could fill your place in {Ort} with a crew that shares one thing ({Thema}), for a few weeks at a time.\n\nWant to be one of our Founding Hosts? ${FREE}\n\n${SIGN}`,
  },
  group: {
    subject: null,
    body: `Hi all! I'm building Simpulo: you open a House for a few weeks and people who share your thing join you. Looking for the first Founding Hosts – anyone into {Thema} around {Ort}?\n\n${FREE} Happy to answer questions here.\n\n${SIGN}`,
  },
  whatsapp: {
    subject: null,
    body: `Great to hear from you, {Name}! Easier to talk on WhatsApp – here's my number: https://wa.me/{Nummer}\n\n${SIGN}`,
  },
};
