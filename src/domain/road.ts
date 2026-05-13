import { Outcome } from "./baccarat";

export type RoadMark = Outcome | "";

export interface BigRoadCell {
  outcome: "P" | "B";
  row: number;
  col: number;
  ties: number;
}

export function buildBeadPlate(outcomes: Outcome[], rows = 6): RoadMark[][] {
  const columns = Math.max(1, Math.ceil(outcomes.length / rows));
  const grid: RoadMark[][] = Array.from({ length: rows }, () => Array.from({ length: columns }, () => ""));
  outcomes.forEach((outcome, index) => {
    grid[index % rows][Math.floor(index / rows)] = outcome;
  });
  return grid;
}

export function buildBigRoad(outcomes: Outcome[], rows = 6): BigRoadCell[] {
  const cells: BigRoadCell[] = [];
  let lastResolved: "P" | "B" | undefined;
  let row = 0;
  let col = 0;

  for (const outcome of outcomes) {
    if (outcome === "T") {
      const latest = cells[cells.length - 1];
      if (latest) latest.ties += 1;
      continue;
    }

    if (!lastResolved) {
      row = 0;
      col = 0;
    } else if (outcome === lastResolved) {
      row += 1;
      if (row >= rows || cells.some((cell) => cell.row === row && cell.col === col)) {
        row = rows - 1;
        col += 1;
      }
    } else {
      col = Math.max(...cells.map((cell) => cell.col), -1) + 1;
      row = 0;
    }

    cells.push({ outcome, row, col, ties: 0 });
    lastResolved = outcome;
  }

  return cells;
}
