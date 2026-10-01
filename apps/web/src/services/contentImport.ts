type ImportRow = Record<string, unknown>;

const recognizableHeaders = new Set([
  "code",
  "l1_code",
  "l1Code",
  "sample_id",
  "sampleId",
  "sample_code",
  "sampleCode"
]);

function hasContentHeader(row: ImportRow) {
  return Object.keys(row).some((key) => recognizableHeaders.has(key));
}

/**
 * Excel is an optional admin import path. Keep SheetJS out of the initial
 * bundle and ignore workbook sheets that describe the method rather than rows.
 */
export async function parseContentWorkbook(file: File): Promise<ImportRow[]> {
  const { read, utils } = await import("xlsx");
  const workbook = read(await file.arrayBuffer(), { type: "array", cellDates: false });
  const rows: ImportRow[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheetRows = utils.sheet_to_json<ImportRow>(workbook.Sheets[sheetName], { defval: "", raw: false });
    if (sheetRows.length && hasContentHeader(sheetRows[0])) rows.push(...sheetRows);
  }
  if (!rows.length) throw new Error("Excel 中没有可识别的内容 sheet，请使用 Playbit 模板表头");
  return rows;
}
