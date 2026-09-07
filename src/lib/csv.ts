/** Quote a single CSV cell, escaping embedded quotes and separators. */
function quote(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(header: string[], rows: string[][]): string {
  return [header, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
}

/** Trigger a browser download of text content. Nothing is uploaded. */
export function downloadCsv(filename: string, content: string): void {
  // The BOM keeps accented characters intact when opened in Excel.
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
