import type { Metadata } from "next";
import { CreateStayForm } from "@/components/views/CreateStayForm";

export const metadata: Metadata = { title: "Open a House" };

export default function CreatePage() {
  return <CreateStayForm />;
}
