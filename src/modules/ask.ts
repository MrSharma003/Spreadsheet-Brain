import { getGemini } from "./gemini";
import { getSession } from "./neo4j";

function cleanCypher(raw: string): string {
  return raw
    .replace(/```cypher/g, "") // remove markdown syntax
    .replace(/```/g, "")
    .replace(/\\n/g, " ") // remove \n
    .replace(/\\"/g, '"') // unescape quotes
    .trim();
}

export async function askQuestion(
  question: string
): Promise<{ cypher: string; answer: any }> {
  const prompt = `
  You are a Cypher expert assistant for a Knowledge Graph built from spreadsheet data.
  
  The schema contains:
  
  NODES:
  - Table {name}
  - Row {id}
  - Column {name}
  - Cell {id, raw_value}
  - Formula {expression}
  - Constant {value}
  
  RELATIONSHIPS:
  - (Table)-[:HAS_ROW]->(Row)
  - (Row)-[:HAS_CELL]->(Cell)
  - (Cell)-[:HAS_COLUMN]->(Column)
  - (Cell)-[:BELONGS_TO]->(Table)
  - (Column)-[:USED_IN]->(Table)
  - (Cell)-[:USES_FORMULA]->(Formula)
  - (Cell)-[:USES_CONSTANT]->(Constant)
  - (Formula)-[:DEPENDS_ON]->(Cell)
  
  RULES:
  - Column headers are always strings (extracted using a strict rule that excludes numbers or formulas).
  - Data values are stored in Constant nodes, not directly in Cell.raw_value.
  - To filter a row by a value (e.g. Product = "Product B"), find a Cell connected to a Constant node with that value, and ensure the Cell is linked to the corresponding Column (e.g. name = "Product").
  - Then, use the row connected to that cell to extract other cells (e.g. "Revenue") in the same row.
  
  EXAMPLES:
  To get Revenue for rows where Product = "Product B":
  MATCH (c:Cell)-[:USES_CONSTANT]->(:Constant {value: "Product B"})
  MATCH (c)-[:HAS_COLUMN]->(:Column {name: "Product"})
  MATCH (c)<-[:HAS_CELL]-(r:Row)-[:HAS_CELL]->(target:Cell)-[:HAS_COLUMN]->(:Column {name: "Revenue"})
  RETURN target.raw_value AS Revenue
  
  To list all values in rows where "Customer" is "Alice Smith":
  MATCH (c:Cell)-[:USES_CONSTANT]->(:Constant {value: "Alice Smith"})
  MATCH (c)-[:HAS_COLUMN]->(:Column {name: "Customer"})
  MATCH (c)<-[:HAS_CELL]-(r:Row)-[:HAS_CELL]->(target:Cell)-[:HAS_COLUMN]->(col:Column)
  RETURN col.name AS Column, target.raw_value AS Value
  
  Now, generate a Cypher query (no markdown, no triple backticks) for:
  
  "${question}"
  
  Cypher:
  `;

  const result = await getGemini(prompt);
  const raw = result.text ?? "";

  const cypher = cleanCypher(raw);
  console.log("🟡 Generated Cypher:", cypher);

  const session = getSession();
  const queryResult = await session.run(cypher);
  const answer = queryResult.records.map((r) => r.toObject());
  await session.close();

  return { cypher, answer };
}
