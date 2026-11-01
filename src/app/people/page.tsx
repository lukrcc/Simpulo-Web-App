import { redirect } from "next/navigation";

/** The People list moved to your own profile ("Lived with"). */
export default function People() {
  redirect("/profile");
}
