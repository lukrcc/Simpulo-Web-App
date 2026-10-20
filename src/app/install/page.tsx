import type { Metadata } from "next";
import { InstallGuide } from "@/components/views/InstallGuide";

export const metadata: Metadata = { title: "Get the app" };

export default function InstallPage() {
  return <InstallGuide />;
}
