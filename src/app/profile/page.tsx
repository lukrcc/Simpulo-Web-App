import type { Metadata } from "next";
import { MyProfile } from "@/components/views/ProfileView";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return <MyProfile />;
}
