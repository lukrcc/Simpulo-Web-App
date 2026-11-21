import { redirect } from "next/navigation";

/** Old links: the host's management is the House area's Manage tab now (/h/[id]?tab=manage); ?focus= goes along. */
export default async function HostManagePage({ params, searchParams }: PageProps<"/h/[id]/manage">) {
  const { id } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) if (typeof value === "string") query.set(key, value);
  query.set("tab", "manage");
  redirect(`/h/${id}?${query}`);
}
