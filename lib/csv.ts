export function parseCSV(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        const peek = text[i + 1];
        if (peek === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === delimiter) {
        row.push(field);
        field = "";
      } else if (c === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === '\r') {
        // handle CRLF; skip if next is \n
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        if (text[i + 1] === '\n') i++;
      } else {
        field += c;
      }
    }
  }
  // flush last field
  row.push(field);
  // avoid adding empty trailing row if it's only one empty field
  if (!(row.length === 1 && row[0] === "" && rows.length > 0)) {
    rows.push(row);
  }
  // remove possible trailing empty row due to final newline
  if (rows.length && rows[rows.length - 1].every((x) => x === "")) rows.pop();
  return rows;
}

type CSVPrimitive = string | number | boolean | null | undefined;
type CSVRecord = Record<string, CSVPrimitive>;

export function toCSV(headers: string[], records: CSVRecord[], delimiter = ","): string {
  const esc = (val: CSVPrimitive) => {
    let s = val == null ? "" : String(val);
    const needs = s.includes('"') || s.includes(delimiter) || s.includes("\n") || s.includes("\r");
    if (s.includes('"')) s = s.replace(/"/g, '""');
    return needs ? `"${s}"` : s;
  };
  const lines = [headers.map(esc).join(delimiter)];
  for (const rec of records) {
    lines.push(headers.map((h) => esc(rec[h])).join(delimiter));
  }
  return lines.join("\n");
}
