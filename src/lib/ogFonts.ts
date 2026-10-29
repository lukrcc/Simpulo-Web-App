import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Inter for the Open Graph images, read from the repo (src/assets/fonts, OFL) – no request to a font CDN. next/og only
// bundles a regular weight, so titles need the bold file.
export type OgFont = { name: string; data: Buffer; weight: 400 | 700; style: "normal" };

const fontFile = (file: string) => readFile(join(process.cwd(), "src/assets/fonts", file));

export async function loadOgFonts(): Promise<OgFont[]> {
  const [regular, bold] = await Promise.all([fontFile("Inter-Regular.ttf"), fontFile("Inter-Bold.ttf")]);
  return [
    { name: "Inter", data: regular, weight: 400, style: "normal" },
    { name: "Inter", data: bold, weight: 700, style: "normal" },
  ];
}
