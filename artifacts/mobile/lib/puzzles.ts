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

export type CatalogId = 'channels' | 'pearl-sums' | 'tidal-squares';
export type CatalogAccent = 'primary' | 'accent' | 'moonlit';
export type PuzzleMode = 'channels' | 'sum' | 'squares';

type PuzzleBase = {
  id: string;
  title: string;
  description: string;
  catalogId: CatalogId;
};

export type ChannelPuzzle = PuzzleBase & {
  mode: 'channels';
  route: CellCoord[];
  shells: CellCoord[];
};

export type SumPuzzle = PuzzleBase & {
  mode: 'sum';
  values: number[][];
  target: number;
  chooseCount: number;
  solution: CellCoord[];
};

export type SquarePuzzle = PuzzleBase & {
  mode: 'squares';
  solution: number[][];
  givens: CellCoord[];
};

export type Puzzle = ChannelPuzzle | SumPuzzle | SquarePuzzle;

export type PuzzleCatalog = {
  id: CatalogId;
  title: string;
  description: string;
  mechanic: string;
  icon: 'git-branch' | 'hash' | 'grid';
  accent: CatalogAccent;
  puzzles: Puzzle[];
};

export const BOARD_SIZE = 5;

export const CHANNEL_PUZZLES: ChannelPuzzle[] = [
  {
    id: 'low-tide',
    title: 'Low Tide',
    description: 'A quiet path through the shallows.',
    catalogId: 'channels',
    mode: 'channels',
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
    catalogId: 'channels',
    mode: 'channels',
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
    catalogId: 'channels',
    mode: 'channels',
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
  {
    id: 'saltglass-bend',
    title: 'Saltglass Bend',
    description: 'A bright turn through the shallows.',
    catalogId: 'channels',
    mode: 'channels',
    route: [
      [2, 0],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
      [3, 2],
      [3, 3],
      [3, 4],
      [2, 4],
    ],
    shells: [
      [1, 1],
      [2, 2],
      [3, 3],
    ],
  },
  {
    id: 'moon-pool',
    title: 'Moon Pool',
    description: 'Let the current curl around the reef.',
    catalogId: 'channels',
    mode: 'channels',
    route: [
      [2, 0],
      [3, 0],
      [3, 1],
      [2, 1],
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 3],
      [2, 4],
    ],
    shells: [
      [3, 1],
      [1, 1],
      [1, 3],
    ],
  },
  {
    id: 'kelp-cathedral',
    title: 'Kelp Cathedral',
    description: 'Thread the tall reef and its hidden turns.',
    catalogId: 'channels',
    mode: 'channels',
    route: [
      [2, 0],
      [1, 0],
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
      [1, 3],
      [2, 3],
      [3, 3],
      [3, 2],
      [4, 2],
      [4, 3],
      [4, 4],
      [3, 4],
      [2, 4],
    ],
    shells: [
      [0, 1],
      [1, 2],
      [3, 2],
      [4, 3],
    ],
  },
  {
    id: 'lantern-reach',
    title: 'Lantern Reach',
    description: 'A winding route beneath the evening lights.',
    catalogId: 'channels',
    mode: 'channels',
    route: [
      [2, 0],
      [3, 0],
      [4, 0],
      [4, 1],
      [3, 1],
      [2, 1],
      [1, 1],
      [1, 2],
      [2, 2],
      [3, 2],
      [3, 3],
      [2, 3],
      [1, 3],
      [1, 4],
      [2, 4],
    ],
    shells: [
      [4, 1],
      [2, 1],
      [1, 2],
      [3, 3],
    ],
  },
  {
    id: 'deepglass-channel',
    title: 'Deepglass Channel',
    description: 'Carry five shells through the deep channels.',
    catalogId: 'channels',
    mode: 'channels',
    route: [
      [2, 0],
      [1, 0],
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 2],
      [0, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
      [3, 4],
      [2, 4],
    ],
    shells: [
      [0, 1],
      [2, 1],
      [0, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    id: 'blue-lanterns',
    title: 'Blue Lanterns',
    description: 'A final, twisting passage through the reef.',
    catalogId: 'channels',
    mode: 'channels',
    route: [
      [2, 0],
      [3, 0],
      [4, 0],
      [4, 1],
      [4, 2],
      [3, 2],
      [2, 2],
      [1, 2],
      [1, 1],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
      [3, 4],
      [2, 4],
    ],
    shells: [
      [4, 1],
      [3, 2],
      [1, 2],
      [0, 2],
      [2, 3],
    ],
  },
];

export const SUM_PUZZLES: SumPuzzle[] = [
  {
    id: 'three-shells',
    title: 'Three Shells',
    description: 'Choose three shell values to make 17.',
    catalogId: 'pearl-sums',
    mode: 'sum',
    values: [
      [2, 4, 9, 6],
      [7, 3, 8, 1],
      [5, 6, 4, 9],
      [3, 7, 2, 5],
    ],
    target: 17,
    chooseCount: 3,
    solution: [
      [0, 1],
      [1, 2],
      [3, 3],
    ],
  },
  {
    id: 'evening-tally',
    title: 'Evening Tally',
    description: 'Pick three pearls that add up to 18.',
    catalogId: 'pearl-sums',
    mode: 'sum',
    values: [
      [6, 9, 3, 7],
      [8, 5, 4, 2],
      [1, 6, 8, 3],
      [5, 7, 2, 9],
    ],
    target: 18,
    chooseCount: 3,
    solution: [
      [0, 2],
      [2, 1],
      [3, 3],
    ],
  },
  {
    id: 'deep-reserve',
    title: 'Deep Reserve',
    description: 'Find four stones whose total is 28.',
    catalogId: 'pearl-sums',
    mode: 'sum',
    values: [
      [4, 6, 3, 8],
      [8, 2, 7, 5],
      [1, 5, 9, 3],
      [7, 4, 6, 7],
    ],
    target: 28,
    chooseCount: 4,
    solution: [
      [1, 0],
      [2, 2],
      [3, 1],
      [3, 3],
    ],
  },
];

export const SQUARE_PUZZLES: SquarePuzzle[] = [
  {
    id: 'first-light',
    title: 'First Light',
    description: 'Give each row and column four different tide marks.',
    catalogId: 'tidal-squares',
    mode: 'squares',
    solution: [
      [0, 1, 2, 3],
      [1, 2, 3, 0],
      [2, 3, 0, 1],
      [3, 0, 1, 2],
    ],
    givens: [
      [0, 0],
      [0, 3],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 2],
      [3, 1],
      [3, 3],
    ],
  },
  {
    id: 'silver-water',
    title: 'Silver Water',
    description: 'Arrange the four marks without repeating a line.',
    catalogId: 'tidal-squares',
    mode: 'squares',
    solution: [
      [0, 2, 1, 3],
      [1, 3, 0, 2],
      [2, 0, 3, 1],
      [3, 1, 2, 0],
    ],
    givens: [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 3],
      [2, 1],
      [2, 2],
      [3, 0],
      [3, 3],
    ],
  },
  {
    id: 'moon-garden',
    title: 'Moon Garden',
    description: 'Complete the square with one of each mark per line.',
    catalogId: 'tidal-squares',
    mode: 'squares',
    solution: [
      [3, 1, 0, 2],
      [0, 2, 3, 1],
      [1, 3, 2, 0],
      [2, 0, 1, 3],
    ],
    givens: [
      [0, 0],
      [0, 2],
      [1, 1],
      [1, 3],
      [2, 0],
      [2, 3],
      [3, 1],
      [3, 2],
    ],
  },
];

export const CATALOGS: PuzzleCatalog[] = [
  {
    id: 'channels',
    title: 'Channel Craft',
    description: 'A pathfinding puzzle played with turning water channels.',
    mechanic: 'Turn pipes to carry a current from spring to pearl.',
    icon: 'git-branch',
    accent: 'primary',
    puzzles: CHANNEL_PUZZLES,
  },
  {
    id: 'pearl-sums',
    title: 'Pearl Sums',
    description: 'A number-combination puzzle about balancing shell values.',
    mechanic: 'Pick a precise set of shells to reach the target sum.',
    icon: 'hash',
    accent: 'accent',
    puzzles: SUM_PUZZLES,
  },
  {
    id: 'tidal-squares',
    title: 'Tidal Squares',
    description: 'A pattern-logic puzzle about arranging four tide marks.',
    mechanic: 'Make every row and column contain four unique marks.',
    icon: 'grid',
    accent: 'moonlit',
    puzzles: SQUARE_PUZZLES,
  },
];

export const PUZZLES: Puzzle[] = CATALOGS.flatMap((catalog) => catalog.puzzles);

export function getDailyPuzzle(dateKey: string): Puzzle {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error('A daily puzzle requires a date in YYYY-MM-DD format.');
  }

  let hash = 2166136261;
  for (let index = 0; index < dateKey.length; index += 1) {
    hash = Math.imul(hash ^ dateKey.charCodeAt(index), 16777619);
  }

  return PUZZLES[(hash >>> 0) % PUZZLES.length];
}

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

export function createBoard(puzzle: ChannelPuzzle, scrambled = true): Board {
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

export function traceCurrent(board: Board, puzzle: ChannelPuzzle) {
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
  puzzle: ChannelPuzzle,
): CellCoord | null {
  for (const [row, column] of puzzle.route) {
    const tile = board[row]?.[column];
    if (tile && tile.rotation !== tile.targetRotation) return [row, column];
  }
  return null;
}

export function createSquareBoard(puzzle: SquarePuzzle): number[][] {
  const givenKeys = new Set(puzzle.givens.map(([row, column]) => `${row},${column}`));
  return puzzle.solution.map((line, row) =>
    line.map((value, column) =>
      givenKeys.has(`${row},${column}`)
        ? value
        : (value + ((row + column) % 3) + 1) % 4,
    ),
  );
}

export function rotateSquareCell(
  board: number[][],
  row: number,
  column: number,
): number[][] {
  return board.map((line, currentRow) =>
    line.map((value, currentColumn) =>
      currentRow === row && currentColumn === column ? (value + 1) % 4 : value,
    ),
  );
}

export function isSquareGridSolved(board: number[][]): boolean {
  const expected = new Set([0, 1, 2, 3]);
  const rowsSolved = board.every(
    (row) => row.length === 4 && new Set(row).size === expected.size,
  );
  const columnsSolved = expected.size === board.length &&
    [...expected].every((_, column) => {
      const values = board.map((row) => row[column]);
      return values.length === 4 && new Set(values).size === expected.size;
    });
  return rowsSolved && columnsSolved;
}

export function getNextSquareHintCell(
  board: number[][],
  puzzle: SquarePuzzle,
): CellCoord | null {
  const givenKeys = new Set(puzzle.givens.map(([row, column]) => `${row},${column}`));
  for (let row = 0; row < puzzle.solution.length; row += 1) {
    for (let column = 0; column < puzzle.solution[row].length; column += 1) {
      if (
        !givenKeys.has(`${row},${column}`) &&
        board[row][column] !== puzzle.solution[row][column]
      ) {
        return [row, column];
      }
    }
  }
  return null;
}

export function sumSelected(
  puzzle: SumPuzzle,
  selected: readonly CellCoord[],
): number {
  return selected.reduce(
    (total, [row, column]) => total + (puzzle.values[row]?.[column] ?? 0),
    0,
  );
}

export function isSumSolved(
  puzzle: SumPuzzle,
  selected: readonly CellCoord[],
): boolean {
  return selected.length === puzzle.chooseCount && sumSelected(puzzle, selected) === puzzle.target;
}

export function getSumHintSelection(
  puzzle: SumPuzzle,
  selected: readonly CellCoord[],
): CellCoord[] {
  const solutionKeys = new Set(puzzle.solution.map(([row, column]) => `${row},${column}`));
  const retained = selected.filter(([row, column]) => solutionKeys.has(`${row},${column}`));
  const nextSolutionCell = puzzle.solution.find(
    ([row, column]) => !retained.some(([selectedRow, selectedColumn]) =>
      selectedRow === row && selectedColumn === column,
    ),
  );
  return nextSolutionCell ? [...retained, nextSolutionCell] : [...retained];
}
