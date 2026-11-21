import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

// The text lives in content/legal/community-guidelines.en.md (CLAUDE.md "Rechtsseiten").
export const generateMetadata = () => legalMetadata("community-guidelines");

export default function Page() {
  return <LegalPage slug="community-guidelines" />;
}
