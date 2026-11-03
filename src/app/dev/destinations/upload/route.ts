import { writeFile } from "node:fs/promises";
import path from "node:path";
import { APP_MODE } from "@/lib/appMode";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_BYTES = 20 * 1024 * 1024;
const MIN_WIDTH = 1600;

/** "Replace image" on /dev/destinations: writes public/destinations/<slug>.jpg. Local development only. */
export async function POST(request: Request) {
  if (APP_MODE !== "dev" || process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const form = await request.formData();
  const slug = form.get("slug");
  const file = form.get("file");
  if (typeof slug !== "string" || !SLUG.test(slug) || !(file instanceof File) || !file.type.startsWith("image/") || file.size > MAX_BYTES) return Response.json({ error: "invalid" }, { status: 400 });
  const { default: sharp } = await import("sharp");
  const root = process.cwd();
  const image = sharp(Buffer.from(await file.arrayBuffer())).rotate();
  const { width = 0, height = 0 } = await image.metadata();
  const output = await image.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  await writeFile(path.join(root, "public", "destinations", `${slug}.jpg`), output);
  const { syncDestinationImages } = await import("@/lib/data/destinationImagesSync");
  const { CURATED_DESTINATIONS } = await import("@/lib/data/destinations");
  syncDestinationImages(root, CURATED_DESTINATIONS.map((d) => d.slug));
  return Response.json({ url: `/destinations/${slug}.jpg?v=${output.length}`, tooSmall: width < MIN_WIDTH || width < height });
}
