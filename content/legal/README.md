# Legal texts

One file per page and language: `<page>.<lang>.md` (`privacy.en.md`, later `privacy.de.md`). The header between the `---` lines:

- `title` – the page title
- `description` – one sentence for search engines
- `version` – raise it with every change of content (0.x while a draft)
- `updated` – the day of the change, YYYY-MM-DD
- `draft` – `true` until a lawyer has reviewed the text. A draft shows "Draft – not yet reviewed" in dev and demo; a production
  build with the preview gate off (the launch) stops while any page is still a draft.

Body: `## Heading {#anchor}`, paragraphs, `- ` lists, `**bold**`, `[link](/path)`. Values in double braces come from the config and are
never typed in: `{{fees.service}}`, `{{payment.windowHours}}` … (src/lib/legal/values.ts), the company from src/config/company.ts
(`{{company.name}}`). An empty company field shows as a marked gap. A line that ends in `{{?company.vatId}}` is left out while the field
is empty (optional fields).

A German version: copy the English file to `<page>.de.md` and translate – the EN/DE switch appears on its own.
