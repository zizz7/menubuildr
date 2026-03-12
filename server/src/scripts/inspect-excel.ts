/**
 * One-off script to inspect an Excel file's structure (sheets, headers, sample rows).
 * Run: npx tsx src/scripts/inspect-excel.ts "C:\path\to\file.xlsx"
 */
import * as XLSX from 'xlsx';
import * as path from 'path';

const excelPath = process.argv[2] || 'C:\\Users\\Nazween\\Documents\\Menu Ingredient Extraction and Analysis.xlsx';

function main() {
  const workbook = XLSX.readFile(excelPath);
  console.log('Sheet names:', workbook.SheetNames);
  console.log('');

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log('--- Sheet:', sheetName, '---');
    console.log('Rows:', data.length);
    if (data.length > 0) {
      console.log('Headers (row 0):', JSON.stringify(data[0]));
      if (data.length > 1) console.log('Row 1:', JSON.stringify(data[1]));
      if (data.length > 2) console.log('Row 2:', JSON.stringify(data[2]));
    }
    console.log('');
  }
}

main();
