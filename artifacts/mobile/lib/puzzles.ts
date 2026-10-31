export type Direction = 'N' | 'E' | 'S' | 'W';
export type CellCoord = [number, number];
export type TileKind = 'straight' | 'corner';

export type PipeTile = {
  kind: TileKind;
  rotation: number;
  targetRotation: number;
  isRoute: boolean;
};

export type Board = (PipeTile | null)[][];

export type Puzzle = {
  id: string;
  title: string;
  description: string;
  route: CellCoord[];
  shells: CellCoord[];
};

export const BOARD_SIZE = 5;

export const PUZZLES: Puzzle[] = [
  {
    id: 'low-tide',
    title: 'Low Tide',
    description: 'A quiet path through the shallows.',
    route: [
      [2, 0],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
      [2, 3],
      [2, 4],
    ],
    shells: [
      [1, 2],
      [2, 3],
    ],
  },
  {
    id: 'blue-hour',
    title: 'Blue Hour',
    description: 'The current bends beneath the reef.',
    route: [
      [2, 0],
      [3, 0],
      [3, 1],
      [3, 2],
      [2, 2],
      [2, 3],
      [2, 4],
    ],
    shells: [
      [3, 1],
      [2, 3],
    ],
  },
  {
    id: 'coral-thread',
    title: 'Coral Thread',
    description: 'Follow the long way around.',
    route: [
      [2, 0],
      [1, 0],
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 2],
      [2, 3],
      [2, 4],
    ],
    shells: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },
];

const DIRECTIONS: Direction[] = ['N', 'E', 'S', 'W'];
const DELTAS: Record<Direction, CellCoord> = {
  N: [-1, 0],
  E: [0, 1],
  S: [1, 0],
  W: [0, -1],
};

function directionBetween(from: CellCoord, to: CellCoord): Direction {
  const rowDifference = to[0] - from[0];
  const columnDifference = to[1] - from[1];
  if (rowDifference === -1) return 'N';
  if (rowDifference === 1) return 'S';
  if (columnDifference === 1) return 'E';
  return 'W';
}

function opposite(direction: Direction): Direction {
  return DIRECTIONS[(DIRECTIONS.indexOf(direction) + 2) % 4];
}

export function connectorsFor(tile: PipeTile): Direction[] {
  const base: Direction[] =
    tile.kind === 'straight' ? ['N', 'S'] : ['N', 'E'];
  return base.map(
    (direction) =>
      DIRECTIONS[(DIRECTIONS.indexOf(direction) + tile.rotation) % 4],
  );
}

function rotationFor(connectors: Direction[], kind: TileKind): number {
  const cycle = kind === 'straight' ? 2 : 4;
  for (let rotation = 0; rotation < cycle; rotation += 1) {
    const candidate: PipeTile = {
      kind,
      rotation,
      targetRotation: 0,
      isRoute: true,
    };
    const actual = connectorsFor(candidate);
    if (
      actual.includes(connectors[0]) &&
      actual.includes(connectors[1])
    ) {
      return rotation;
    }
  }
  return 0;
}

export function createBoard(puzzle: Puzzle, scrambled = true): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
  const offsets = [1, 1, 1, 1, 1, 1, 1, 1, 1];

  puzzle.route.forEach((coord, index) => {
    const previous: CellCoord =
      index === 0 ? [coord[0], coord[1] - 1] : puzzle.route[index - 1];
    const next: CellCoord =
      index === puzzle.route.length - 1
        ? [coord[0], coord[1] + 1]
        : puzzle.route[index + 1];
    const connectors = [
      directionBetween(coord, previous),
      directionBetween(coord, next),
    ];
    const isStraight =
      (connectors.includes('N') && connectors.includes('S')) ||
      (connectors.includes('E') && connectors.includes('W'));
    const kind: TileKind = isStraight ? 'straight' : 'corner';
    const targetRotation = rotationFor(connectors, kind);
    const cycle = kind === 'straight' ? 2 : 4;
    const offset = scrambled ? offsets[index] ?? 1 : 0;
    board[coord[0]][coord[1]] = {
      kind,
      targetRotation,
      rotation: (targetRotation + offset) % cycle,
      isRoute: true,
    };
  });

  return board;
}

export function rotateBoardTile(
  board: Board,
  row: number,
  column: number,
): Board {
  const tile = board[row]?.[column];
  if (!tile) return board;

  const next = board.map((line) => [...line]);
  const cycle = tile.kind === 'straight' ? 2 : 4;
  next[row][column] = { ...tile, rotation: (tile.rotation + 1) % cycle };
  return next;
}

export function traceCurrent(board: Board, puzzle: Puzzle) {
  const visited = new Set<string>();
  let row = 2;
  let column = 0;
  let incoming: Direction = 'W';

  for (let steps = 0; steps < BOARD_SIZE * BOARD_SIZE; steps += 1) {
    const key = `${row},${column}`;
    if (visited.has(key)) break;
    visited.add(key);

    const tile = board[row]?.[column];
    if (!tile) break;
    const connectors = connectorsFor(tile);
    if (!connectors.includes(incoming)) break;

    const outgoing = connectors.find((direction) => direction !== incoming);
    if (!outgoing) break;

    if (row === 2 && column === BOARD_SIZE - 1 && outgoing === 'E') {
      const passedShells = puzzle.shells.every(([shellRow, shellColumn]) =>
        visited.has(`${shellRow},${shellColumn}`),
      );
      return { visited, connected: passedShells };
    }

    const [rowDelta, columnDelta] = DELTAS[outgoing];
    const nextRow = row + rowDelta;
    const nextColumn = column + columnDelta;
    const nextTile = board[nextRow]?.[nextColumn];
    if (!nextTile || !connectorsFor(nextTile).includes(opposite(outgoing))) {
      break;
    }

    row = nextRow;
    column = nextColumn;
    incoming = opposite(outgoing);
  }

  return { visited, connected: false };
}

export function getNextHintCell(
  board: Board,
  puzzle: Puzzle,
): CellCoord | null {
  for (const [row, column] of puzzle.route) {
    const tile = board[row]?.[column];
    if (tile && tile.rotation !== tile.targetRotation) return [row, column];
  }
  return null;
}
