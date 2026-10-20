import type { Metadata } from "next";
import { MyStays } from "@/components/views/MyStays";

export const metadata: Metadata = { title: "Houses" };

export default function MyStaysPage() {
  return <MyStays />;
}
