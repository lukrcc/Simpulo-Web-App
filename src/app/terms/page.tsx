import type { Metadata } from "next";
import { ContentPage, TodoNote } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <ContentPage title="Terms of Service">
      <TodoNote>Placeholder text – replace with the real, legally reviewed version before launch.</TodoNote>
      <p>Terms of service – rules for hosts and guests, payments and fees, cancellations and liability.</p>
    </ContentPage>
  );
}
