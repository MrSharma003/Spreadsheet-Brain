export interface Node {
  id: string;
  type: "Cell" | "Formula" | "Constant" | "Table" | "Sheet";
  position: string;
  value: string;
}

// triplets: ("cell:A3", "DERIVES_FROM", "cell:A1")
export interface Edge {
  from: string;
  to: string;
  relation:
    | "USES_FORMULA"
    | "DEPENDS_ON"
    | "USES_CONSTANT"
    | "BELONGS_TO"
    | "USED_IN";
}

export interface Graph {
  edges: Edge[];
  nodes: Node[];
}

export interface Table{
    row_start: number;
    row_end: number;
    col_start: number;
    col_end: number;
}
