/** public/destinations/*.jpg → the list the app reads, and MISSING.md. Runs before `dev` and `build`. */
import path from "node:path";
import { CURATED_DESTINATIONS } from "../src/lib/data/destinations";
import { syncDestinationImages } from "../src/lib/data/destinationImagesSync";

const { slugs, missing } = syncDestinationImages(path.resolve(__dirname, ".."), CURATED_DESTINATIONS.map((d) => d.slug));
console.log(`destinations: ${slugs.length} images, ${missing.length} missing`);
