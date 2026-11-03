// The curated destinations: always approved. Image: public/destinations/<slug>.jpg if the file exists (curated), else the
// fallback card. No image URLs in here. Coordinates are rounded city centres.
import type { WorldRegion } from "../interests";
import { CURATED_IMAGE_SLUGS } from "./destination-images.generated";
import { slugOf, type Destination } from "./destinationTypes";

type Row = readonly [name: string, country: string, countryCode: string, lat: number, lng: number];

const LIST: Readonly<Record<WorldRegion, readonly Row[]>> = {
  southeastAsia: [
    ["Bangkok", "Thailand", "TH", 13.76, 100.5], ["Chiang Mai", "Thailand", "TH", 18.79, 98.98], ["Koh Phangan", "Thailand", "TH", 9.73, 100.01], ["Phuket", "Thailand", "TH", 7.88, 98.39], ["Krabi", "Thailand", "TH", 8.09, 98.91],
    ["Canggu", "Indonesia", "ID", -8.65, 115.13], ["Ubud", "Indonesia", "ID", -8.51, 115.26], ["Uluwatu", "Indonesia", "ID", -8.83, 115.09], ["Lombok", "Indonesia", "ID", -8.65, 116.32],
    ["Da Nang", "Vietnam", "VN", 16.05, 108.2], ["Hoi An", "Vietnam", "VN", 15.88, 108.33], ["Ho Chi Minh City", "Vietnam", "VN", 10.82, 106.63], ["Hanoi", "Vietnam", "VN", 21.03, 105.85],
    ["Kuala Lumpur", "Malaysia", "MY", 3.14, 101.69], ["Penang", "Malaysia", "MY", 5.41, 100.33], ["Singapore", "Singapore", "SG", 1.35, 103.82],
    ["Siargao", "Philippines", "PH", 9.86, 126.05], ["El Nido", "Philippines", "PH", 11.19, 119.4], ["Siem Reap", "Cambodia", "KH", 13.36, 103.86], ["Luang Prabang", "Laos", "LA", 19.89, 102.14],
  ],
  eastAsia: [
    ["Tokyo", "Japan", "JP", 35.68, 139.69], ["Kyoto", "Japan", "JP", 35.01, 135.77], ["Osaka", "Japan", "JP", 34.69, 135.5], ["Okinawa", "Japan", "JP", 26.21, 127.68],
    ["Seoul", "South Korea", "KR", 37.57, 126.98], ["Busan", "South Korea", "KR", 35.18, 129.08], ["Taipei", "Taiwan", "TW", 25.03, 121.57], ["Hong Kong", "Hong Kong", "HK", 22.32, 114.17],
  ],
  southAsia: [
    ["Goa", "India", "IN", 15.3, 74.12], ["Rishikesh", "India", "IN", 30.09, 78.27], ["Weligama", "Sri Lanka", "LK", 5.97, 80.42], ["Pokhara", "Nepal", "NP", 28.21, 83.99],
  ],
  middleEast: [
    ["Dubai", "United Arab Emirates", "AE", 25.2, 55.27], ["Istanbul", "Türkiye", "TR", 41.01, 28.98],
  ],
  europe: [
    ["Lisbon", "Portugal", "PT", 38.72, -9.14], ["Porto", "Portugal", "PT", 41.15, -8.61], ["Ericeira", "Portugal", "PT", 38.96, -9.42], ["Funchal, Madeira", "Portugal", "PT", 32.65, -16.91], ["Lagos", "Portugal", "PT", 37.1, -8.67],
    ["Barcelona", "Spain", "ES", 41.39, 2.17], ["Madrid", "Spain", "ES", 40.42, -3.7], ["Valencia", "Spain", "ES", 39.47, -0.38], ["Málaga", "Spain", "ES", 36.72, -4.42], ["Tarifa", "Spain", "ES", 36.01, -5.6],
    ["Las Palmas, Gran Canaria", "Spain", "ES", 28.12, -15.43], ["Tenerife", "Spain", "ES", 28.29, -16.63], ["Ibiza", "Spain", "ES", 38.91, 1.43], ["Palma, Mallorca", "Spain", "ES", 39.57, 2.65],
    ["Berlin", "Germany", "DE", 52.52, 13.41], ["Munich", "Germany", "DE", 48.14, 11.58], ["Amsterdam", "Netherlands", "NL", 52.37, 4.9],
    ["Paris", "France", "FR", 48.86, 2.35], ["Biarritz", "France", "FR", 43.48, -1.56], ["Chamonix", "France", "FR", 45.92, 6.87],
    ["London", "United Kingdom", "GB", 51.51, -0.13], ["Edinburgh", "United Kingdom", "GB", 55.95, -3.19], ["Dublin", "Ireland", "IE", 53.35, -6.26],
    ["Copenhagen", "Denmark", "DK", 55.68, 12.57], ["Stockholm", "Sweden", "SE", 59.33, 18.07], ["Prague", "Czechia", "CZ", 50.08, 14.44], ["Budapest", "Hungary", "HU", 47.5, 19.04],
    ["Vienna", "Austria", "AT", 48.21, 16.37], ["Innsbruck", "Austria", "AT", 47.27, 11.39], ["Kraków", "Poland", "PL", 50.06, 19.94],
    ["Split", "Croatia", "HR", 43.51, 16.44], ["Dubrovnik", "Croatia", "HR", 42.65, 18.09], ["Athens", "Greece", "GR", 37.98, 23.73], ["Chania, Crete", "Greece", "GR", 35.51, 24.02],
    ["Rome", "Italy", "IT", 41.9, 12.5], ["Milan", "Italy", "IT", 45.46, 9.19], ["Palermo, Sicily", "Italy", "IT", 38.12, 13.36],
    ["Tbilisi", "Georgia", "GE", 41.72, 44.79], ["Tromsø", "Norway", "NO", 69.65, 18.96], ["Lofoten", "Norway", "NO", 68.15, 13.99],
  ],
  africa: [
    ["Cape Town", "South Africa", "ZA", -33.92, 18.42], ["Marrakech", "Morocco", "MA", 31.63, -7.98], ["Taghazout", "Morocco", "MA", 30.54, -9.71], ["Dahab", "Egypt", "EG", 28.5, 34.51], ["Zanzibar", "Tanzania", "TZ", -6.16, 39.2], ["Nairobi", "Kenya", "KE", -1.29, 36.82],
  ],
  latinAmerica: [
    ["Mexico City", "Mexico", "MX", 19.43, -99.13], ["Oaxaca", "Mexico", "MX", 17.07, -96.72], ["Tulum", "Mexico", "MX", 20.21, -87.46], ["Puerto Escondido", "Mexico", "MX", 15.87, -97.07],
    ["Medellín", "Colombia", "CO", 6.24, -75.58], ["Cartagena", "Colombia", "CO", 10.39, -75.51], ["Buenos Aires", "Argentina", "AR", -34.6, -58.38], ["Rio de Janeiro", "Brazil", "BR", -22.91, -43.17],
    ["Florianópolis", "Brazil", "BR", -27.6, -48.55], ["Santa Teresa", "Costa Rica", "CR", 9.65, -85.17], ["Cusco", "Peru", "PE", -13.53, -71.97],
  ],
  northAmerica: [
    ["New York", "United States", "US", 40.71, -74.01], ["Los Angeles", "United States", "US", 34.05, -118.24], ["Miami", "United States", "US", 25.76, -80.19], ["Austin", "United States", "US", 30.27, -97.74], ["Montreal", "Canada", "CA", 45.5, -73.57],
  ],
  oceania: [
    ["Sydney", "Australia", "AU", -33.87, 151.21], ["Melbourne", "Australia", "AU", -37.81, 144.96], ["Byron Bay", "Australia", "AU", -28.64, 153.61], ["Queenstown", "New Zealand", "NZ", -45.03, 168.66],
  ],
};

const curatedImages: ReadonlySet<string> = new Set(CURATED_IMAGE_SLUGS);

export const CURATED_DESTINATIONS: readonly Destination[] = (Object.entries(LIST) as [WorldRegion, readonly Row[]][]).flatMap(([region, rows]) =>
  rows.map(([name, country, countryCode, lat, lng]): Destination => {
    const slug = slugOf(name);
    const curated = curatedImages.has(slug);
    return {
      id: slug,
      slug,
      name,
      country,
      countryCode,
      region,
      lat,
      lng,
      ...(curated && { coverImage: `/destinations/${slug}.jpg` }),
      imageSource: curated ? "curated" : "fallback",
      status: "approved",
      interestedCount: 0,
      interestedMonths: [],
    };
  }),
);
