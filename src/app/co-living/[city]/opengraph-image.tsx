import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/ogFonts";
import { getCities, getCrew, getStaysByCity } from "@/lib/data/stays";
import { OG_SIZE, OgCard, ogPictures } from "@/lib/ogCard";

export const alt = "Co-living on Simpulo: open Houses in this city";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Share card for a city page: the first open House's cover and crew, "Co-living in {City}", how many Houses are open. */
export default async function Image({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = (await getCities()).find((c) => c.slug === slug);
  const stays = city ? await getStaysByCity(city.slug) : [];
  const first = stays[0];
  const [pictures, fonts] = await Promise.all([first ? ogPictures(first, await getCrew(first)) : Promise.resolve({ cover: null, faces: [] }), loadOgFonts()]);
  return new ImageResponse(
    <OgCard
      cover={pictures.cover}
      eyebrow="Co-living"
      title={city ? `Co-living in ${city.name}` : "Co-living"}
      line={city?.country}
      strong={`${stays.length} open ${stays.length === 1 ? "House" : "Houses"}`}
      faces={pictures.faces}
    />,
    { ...size, fonts },
  );
}
