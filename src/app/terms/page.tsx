import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

// The text lives in content/legal/terms.en.md (CLAUDE.md "Rechtsseiten").
export const generateMetadata = () => legalMetadata("terms");

export default function Page() {
  return <LegalPage slug="terms" />;
}
