// Excel (.xlsx) without a library: the Office Open XML parts in a ZIP – one sheet "Journal", a bold head row, numbers as numbers.
import type { Exporter } from "./types";
import { fileStem, journalHead, journalRow } from "./journal";
import { zip } from "./zip";

const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const col = (i: number): string => (i < 26 ? String.fromCharCode(65 + i) : col(Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26)));

function sheetXml(head: readonly string[], rows: readonly (readonly (string | number)[])[]): string {
  const cells = (row: readonly (string | number)[], r: number, style = 0) =>
    row
      .map((v, c) => {
        const ref = `${col(c)}${r}`;
        return typeof v === "number" ? `<c r="${ref}"${style ? ` s="${style}"` : ""}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ""}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
      })
      .join("");
  const body = [`<row r="1">${cells(head, 1, 1)}</row>`, ...rows.map((row, i) => `<row r="${i + 2}">${cells(row, i + 2)}</row>`)].join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${body}</sheetData></worksheet>`;
}

/** Any table as one .xlsx sheet. */
export function tableXlsx(sheetName: string, head: readonly string[], rows: readonly (readonly (string | number)[])[]): Blob {
  const files = [
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>` },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml(head, rows) },
  ];
  return new Blob([zip(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export const xlsxExporter: Exporter = {
  id: "xlsx",
  ready: true,
  fileName: (ctx) => `${fileStem("journal", ctx.period.key)}.xlsx`,
  build: (ctx) => tableXlsx("Journal", journalHead(), ctx.entries.map(journalRow)),
};
