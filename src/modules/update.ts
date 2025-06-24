// Real-Time Update from Google Apps Script Webhook
import { extractCellReferences, globalBlocks } from "./ingest";
import { getSession } from "./neo4j";

function getTableNameFromAddress(sheet: string, rowIndex: number): string | null {
    const blocks = globalBlocks[sheet];
    if (!blocks) return null;
  
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.dataRows.includes(rowIndex)) {
        return `${sheet}_Table${i + 1}`;
      }
    }
    return null;
  }
  
  function getColumnFromAddress(address: string): string {
    const match = address.match(/!([A-Z]+)\d+$/);
    return match?.[1] || "A";
  }
  
  function getRowIndexFromAddress(address: string): number {
    const match = address.match(/\d+$/);
    return match ? parseInt(match[0], 10) : -1;
  }
  
  export async function updateCellFromWebhook({
    address,
    value,
    sheet,
    formula,
  }: {
    address: string;
    value: any;
    sheet: string;
    formula?: string;
  }) {
    const session = getSession();
  
    const col = getColumnFromAddress(address); // e.g., "E"
    const row = getRowIndexFromAddress(address); // e.g., 10
  
    const tableName = getTableNameFromAddress(sheet, row);
    if (!tableName) {
      console.error("Could not resolve table for:", address);
      return;
    }
  
    const cellId = `${tableName}!${col}${row}`;
    const rowId = `${tableName}_Row${row}`;
  
    // --- 1. Update Cell node ---
    await session.run(
      `MERGE (cell:Cell {id: $cellId})
       SET cell.raw_value = $value`,
      { cellId, value }
    );
  
    // --- 2. Reconnect Cell to Table ---
    await session.run(
      `MATCH (cell:Cell {id: $cellId}), (table:Table {name: $tableName})
       MERGE (cell)-[:BELONGS_TO]->(table)`,
      { cellId, tableName }
    );
  
    // --- 3. Reconnect Cell to Row ---
    await session.run(
      `MATCH (cell:Cell {id: $cellId}), (row:Row {id: $rowId})
       MERGE (row)-[:HAS_CELL]->(cell)`,
      { cellId, rowId }
    );
  
    // --- 4. Link to Constant or Formula ---
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
  
    await session.close();
  }
  