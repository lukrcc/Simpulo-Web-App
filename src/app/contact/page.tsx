import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/ContentPage";
import { CONTACT_EMAIL } from "@/components/layout/secondaryLinks";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <ContentPage title="Contact">
      <p>
        Questions, feedback or a problem with a House? Write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-accent hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </ContentPage>
  );
}
