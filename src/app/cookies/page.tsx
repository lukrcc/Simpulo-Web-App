import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

// The text lives in content/legal/cookies.en.md (CLAUDE.md "Rechtsseiten").
export const generateMetadata = () => legalMetadata("cookies");

export default function Page() {
  return <LegalPage slug="cookies" />;
}
