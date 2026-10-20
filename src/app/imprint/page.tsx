import type { Metadata } from "next";
import { ContentPage, TodoNote } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "Imprint" };

export default function ImprintPage() {
  return (
    <ContentPage title="Imprint">
      <TodoNote>Placeholder text – replace with the real, legally reviewed version before launch.</TodoNote>
      <p>Legal notice – company name, address, managing director, register entry and contact details.</p>
    </ContentPage>
  );
}
