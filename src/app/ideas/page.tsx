import type { Metadata } from "next";
import { IdeasBoardPage } from "@/components/help/IdeasBoard";

export const metadata: Metadata = { title: "Top ideas", robots: { index: false, follow: false } };

/** The public ideas board – prepared, off: a 404 until config/platform.ts ideasBoard is true (checked in IdeasBoardPage). */
export default function Page() {
  return <IdeasBoardPage />;
}
