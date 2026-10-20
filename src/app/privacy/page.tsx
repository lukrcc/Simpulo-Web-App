import type { Metadata } from "next";
import { ContentPage, TodoNote } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <ContentPage title="Privacy Policy">
      <TodoNote>Placeholder text – replace with the real, legally reviewed version before launch.</TodoNote>
      <p>Privacy policy – what data Simpulo collects, why, how long it is kept, and how users can request deletion.</p>
    </ContentPage>
  );
}
