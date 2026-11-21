import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

// The text lives in content/legal/cancellation.en.md (CLAUDE.md "Rechtsseiten").
export const generateMetadata = () => legalMetadata("cancellation");

export default function Page() {
  return <LegalPage slug="cancellation" />;
}
