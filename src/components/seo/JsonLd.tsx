import { jsonLdString } from "@/lib/seo";

/** Structured data for crawlers, rendered on the server with the page (see Next's JSON-LD guide). One script per object. */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <>
      {(Array.isArray(data) ? data : [data]).map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(item) }} />
      ))}
    </>
  );
}
