import { tEn } from "@/lib/i18n/translate";
import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/ogFonts";
import { getCities, getCrew, getStaysByCity } from "@/lib/data/stays";
import { OG_SIZE, OgCard, ogPictures } from "@/lib/ogCard";
import { CURATED_DESTINATIONS } from "@/lib/data/destinations";

export const alt = tEn("og.coLiving.alt");
export const size = OG_SIZE;
export const contentType = "image/png";

/** Share card for a city page: the first open House's cover and crew, "Co-living in {City}", how many Houses are open. */
export default async function Image({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  // A curated city without a House yet still has its name (and country) on the card.
  const curated = CURATED_DESTINATIONS.find((d) => d.slug === slug);
  const city = (await getCities()).find((c) => c.slug === slug) ?? (curated ? { slug: curated.slug, name: curated.name, country: curated.country, count: 0 } : undefined);
  const stays = city ? await getStaysByCity(city.slug) : [];
  const first = stays[0];
  const [pictures, fonts] = await Promise.all([first ? ogPictures(first, await getCrew(first)) : Promise.resolve({ cover: null, faces: [] }), loadOgFonts()]);
  return new ImageResponse(
    <OgCard
      cover={pictures.cover}
      eyebrow={tEn("og.coLiving.eyebrow")}
      title={city ? tEn("og.coLiving.title", { city: city.name }) : tEn("og.coLiving.eyebrow")}
      line={city?.country}
      strong={tEn("og.openHouses", { count: stays.length })}
      faces={pictures.faces}
    />,
    { ...size, fonts },
  );
}
