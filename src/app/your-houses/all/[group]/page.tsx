import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { YourHouses } from "@/components/views/YourHouses";
import { YOUR_ROWS, type YourRowKey } from "@/config/yourHouses";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = { title: "Your houses", robots: PRIVATE_ROBOTS };

/** Your houses › "See all": one row (Hosting, Going, Waiting, Lived in, For your next trip) as a grid. The segment is read inside a
 *  Suspense boundary, like /your-houses/[id]; any other group is a 404. */
export default function YourHousesGroupPage({ params }: PageProps<"/your-houses/all/[group]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GroupView params={params} />
    </Suspense>
  );
}

async function GroupView({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  if (!(YOUR_ROWS as readonly string[]).includes(group)) notFound();
  return <YourHouses group={group as YourRowKey} />;
}
