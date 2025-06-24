// File: src/modules/ingest.ts
import { getSheet } from "./google";
import { getSession } from "./neo4j";

interface Block {
  headerRowIndex: number;
  dataRows: number[];
}

export declare let globalBlocks: Record<string, Block[]>;

export function extractCellReferences(formula: string): string[] {
  return [...new Set(formula.match(/[A-Z]+[0-9]+/g) || [])];
}

function splitIntoTableBlocks(
  rows: any[]
): Block[] {
  const blocks: { headerRowIndex: number; dataRows: number[] }[] = [];
  let currentBlock: { headerRowIndex: number; dataRows: number[] } | null =
    null;

  const isStrictHeaderRow = (row: any): boolean => {
    const cells = row?.values || [];
    if (cells.length === 0) return false;

    let hasNonEmpty = false;

    for (const cell of cells) {
      const val = cell?.formattedValue?.trim().slice(0, 3) || "";
      if (!val) continue;

      hasNonEmpty = true;
      if (!isNaN(Number(val)) || val.startsWith("=")) {
        return false;
      }
    }

    return hasNonEmpty;
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (isStrictHeaderRow(row)) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { headerRowIndex: i, dataRows: [] };
    } else if (currentBlock) {
      currentBlock.dataRows.push(i); // includes empty and numeric rows
    }
  }

  if (currentBlock) blocks.push(currentBlock);

  return blocks;
}

// Full Spreadsheet Ingestion
export async function ingestSpreadsheet(spreadsheetId: string) {
  const sheetData = await getSheet(spreadsheetId);
  const session = getSession();

  for (const sheet of sheetData.sheets || []) {
    const title = sheet.properties?.title || "Unnamed";
    const rows = sheet.data?.[0].rowData || [];

    const blocks = splitIntoTableBlocks(rows);
    globalBlocks = { ...globalBlocks, [`${title}`]: blocks };
    console.log("blocks:", globalBlocks);
    let blockIndex = 0;

    for (const block of blocks) {
      const { headerRowIndex, dataRows } = block;
      const headerCells = rows[headerRowIndex]?.values || [];

      const headers = headerCells.map(
        (h, i) => h.formattedValue?.trim() || `Col${i + 1}`
      );

      const tableName = `${title}_Table${++blockIndex}`;

      // Create Table node
      await session.run(`MERGE (t:Table {name: $tableName})`, { tableName });

      // Create Column nodes and link to Table
      for (const header of headers) {
        await session.run(
          `MERGE (col:Column {name: $header})
           WITH col
           MATCH (t:Table {name: $tableName})
           MERGE (col)-[:USED_IN]->(t)`,
          { header, tableName }
        );
      }

      // Process data rows
      for (const r of dataRows) {
        const row = rows[r]?.values;
        if (!row) continue;

        const rowId = `${tableName}_Row${r + 1}`;

        // Create Row and link to Table
        await session.run(
          `MERGE (row:Row {id: $rowId})
           WITH row
           MATCH (t:Table {name: $tableName})
           MERGE (t)-[:HAS_ROW]->(row)`,
          { rowId, tableName }
        );

        for (let c = 0; c < headers.length; c++) {
          const header = headers[c];
          const cellMeta = row[c];
          const value = cellMeta?.formattedValue;
          const formula = cellMeta?.userEnteredValue?.formulaValue;

          if (value == null || header == null) continue;

          const colLetter = String.fromCharCode(65 + c);
          const cellId = `${tableName}!${colLetter}${r + 1}`;

          // Create Cell node
          await session.run(
            `MERGE (cell:Cell {id: $cellId})
             SET cell.raw_value = $value`,
            { cellId, value }
          );

          // Link Cell to Table
          await session.run(
            `MATCH (cell:Cell {id: $cellId})
             MATCH (t:Table {name: $tableName})
             MERGE (cell)-[:BELONGS_TO]->(t)`,
            { cellId, tableName }
          );

          // Link Cell to Column
          await session.run(
            `MATCH (cell:Cell {id: $cellId})
             MATCH (col:Column {name: $header})
             MERGE (cell)-[:HAS_COLUMN]->(col)`,
            { cellId, header }
          );

          // Link Cell to Row
          await session.run(
            `MATCH (cell:Cell {id: $cellId})
             MATCH (row:Row {id: $rowId})
             MERGE (row)-[:HAS_CELL]->(cell)`,
            { cellId, rowId }
          );

          // Constants and Formulas
          if (!formula) {
            await session.run(
              `MERGE (const:Constant {value: $value})
               WITH const
               MATCH (cell:Cell {id: $cellId})
               MERGE (cell)-[:USES_CONSTANT]->(const)`,
              { value, cellId }
            );
          } else {
            const expression = formula;

            await session.run(
              `MERGE (formula:Formula {expression: $expression})
               WITH formula
               MATCH (cell:Cell {id: $cellId})
               MERGE (cell)-[:USES_FORMULA]->(formula)`,
              { expression, cellId }
            );

            const refs = extractCellReferences(expression);
            for (const ref of refs) {
              const refId = `${tableName}!${ref}`;
              await session.run(
                `MERGE (dep:Cell {id: $refId})
                 WITH dep
                 MATCH (formula:Formula {expression: $expression})
                 MERGE (formula)-[:DEPENDS_ON]->(dep)`,
                { expression, refId }
              );
            }
          }
        }
      }
    }
  }

  await session.close();
}

