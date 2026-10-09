/** Build a CSV string from rows and trigger a browser download. */
export function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const escape = (cell: string | number | null) => {
    const s = cell == null ? '' : String(cell);
    // Wrap in quotes if the value contains a comma, quote, or newline.
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n');
  // Prepend a BOM so Excel opens UTF-8 correctly.
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
