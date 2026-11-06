import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/ogFonts";
import { getCrew, getStayRecord } from "@/lib/data/stays";
import { OG_SIZE, OgCard, ogDates, ogPictures, ogPrice } from "@/lib/ogCard";

export const alt = "A House on Simpulo: cover, title, dates, place, price and crew";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Share card for a House: cover, title, dates · place, price pp, the crew and "2 of 6 in", the wordmark. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const record = await getStayRecord(slug);
  // Drafts never get a card of their own.
  const stay = record && record.status !== "draft" && record.status !== "draft_unclaimed" ? record : undefined;
  const crew = stay ? await getCrew(stay) : [];
  const [pictures, fonts] = await Promise.all([stay ? ogPictures(stay, crew) : Promise.resolve({ cover: null, faces: [] }), loadOgFonts()]);
  return new ImageResponse(
    stay ? (
      <OgCard
        cover={pictures.cover}
        title={stay.title}
        line={`${ogDates(stay.startDate, stay.endDate)} · ${stay.city || stay.region}`}
        strong={ogPrice(stay)}
        faces={pictures.faces}
        crewLine={`${stay.spotsFilled} of ${stay.spotsTotal} in`}
      />
    ) : (
      <OgCard cover={null} title="Simpulo" line="Share a place. Find your people." />
    ),
    { ...size, fonts },
  );
}
