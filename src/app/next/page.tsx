import { permanentRedirect } from "next/navigation";

/** The old address of /destinations. */
export default function NextPage() {
  permanentRedirect("/destinations");
}
