import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

// The text lives in content/legal/privacy.en.md (CLAUDE.md "Rechtsseiten").
export const generateMetadata = () => legalMetadata("privacy");

export default function Page() {
  return <LegalPage slug="privacy" />;
}
