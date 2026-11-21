import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

// The text lives in content/legal/impressum.en.md (CLAUDE.md "Rechtsseiten").
export const generateMetadata = () => legalMetadata("impressum");

export default function Page() {
  return <LegalPage slug="impressum" />;
}
