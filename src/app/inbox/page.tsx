import type { Metadata } from "next";
import { InboxList } from "@/components/views/InboxList";

export const metadata: Metadata = { title: "Messages" };

export default function InboxPage() {
  return <InboxList />;
}
