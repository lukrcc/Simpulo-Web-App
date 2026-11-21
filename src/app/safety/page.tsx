import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

// The text lives in content/legal/safety.en.md (CLAUDE.md "Rechtsseiten").
export const generateMetadata = () => legalMetadata("safety");

export default function Page() {
  return <LegalPage slug="safety" />;
}
