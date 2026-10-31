import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { PearlSumBoard, TidalSquareBoard } from '@/components/PuzzleBoards';
import {
  BOARD_SIZE,
  Board,
  CellCoord,
  CATALOGS,
  CHANNEL_PUZZLES,
  PipeTile,
  PUZZLES,
  Puzzle,
  PuzzleCatalog,
  SquarePuzzle,
  connectorsFor,
  createBoard,
  createSquareBoard,
  getDailyPuzzle,
  getNextHintCell,
  getNextSquareHintCell,
  getSumHintSelection,
  isSquareGridSolved,
  isSumSolved,
  rotateBoardTile,
  rotateSquareCell,
  traceCurrent,
} from '@/lib/puzzles';
import {
  EMPTY_PROGRESS,
  GameProgress,
  getDailyStreak,
  getLocalDateKey,
  readProgress,
  writeProgress,
} from '@/lib/progress';

type ScreenMode = 'home' | 'catalog' | 'game';
type LoadState = 'loading' | 'ready' | 'error';

const iconCell = 60;

function GridPipe({
  tile,
  flowing,
  color,
}: {
  tile: PipeTile;
  flowing: boolean;
  color: string;
}) {
  const connectors = connectorsFor(tile);
  const points: Record<string, [number, number]> = {
    N: [30, 5],
    E: [55, 30],
    S: [30, 55],
    W: [5, 30],
  };
  const stroke = flowing ? color : undefined;

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${iconCell} ${iconCell}`}>
      {connectors.map((direction) => {
        const [x, y] = points[direction];
        return (
          <Line
            key={direction}
            x1="30"
            y1="30"
            x2={x}
            y2={y}
            stroke={stroke}
            strokeWidth="8"
            strokeLinecap="round"
          />
        );
      })}
      <Circle cx="30" cy="30" r="5" fill={stroke} />
    </Svg>
  );
}

function GameCell({
  tile,
  row,
  column,
  size,
  isFlowing,
  isShell,
  isSource,
  isPearl,
  colors,
  onPress,
}: {
  tile: PipeTile | null;
  row: number;
  column: number;
  size: number;
  isFlowing: boolean;
  isShell: boolean;
  isSource: boolean;
  isPearl: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const accessibleLabel = tile
    ? `${tile.kind} channel at row ${row + 1}, column ${column + 1}${isShell ? ', shell marker' : ''}`
    : `Empty reef at row ${row + 1}, column ${column + 1}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibleLabel}
      testID={`pipe-${row}-${column}`}
      disabled={!tile}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        {
          width: size,
          height: size,
          backgroundColor: tile ? colors.boardCell : colors.emptyCell,
          borderColor: isFlowing ? colors.primary : colors.border,
          opacity: pressed ? 0.78 : tile ? 1 : 0.8,
        },
        isSource && styles.sourceCell,
        isPearl && styles.pearlCell,
      ]}
    >
      {tile ? (
        <GridPipe tile={tile} flowing={isFlowing} color={colors.primary} />
      ) : null}
      {isShell ? <View style={styles.shellDot} /> : null}
      {isSource ? (
        <View style={[styles.endpointTag, styles.sourceTag]}>
          <Feather name="arrow-right" size={9} color={colors.primaryForeground} />
        </View>
      ) : null}
      {isPearl ? (
        <View style={[styles.endpointTag, styles.pearlTag]}>
          <Feather name="star" size={9} color={colors.accentForeground} />
        </View>
      ) : null}
    </Pressable>
  );
}

function IconButton({
  name,
  label,
  onPress,
  colors,
  size = 42,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Feather name={name} size={21} color={colors.foreground} />
    </Pressable>
  );
}

export default function TideglassScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [mode, setMode] = useState<ScreenMode>('home');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [progress, setProgress] = useState<GameProgress>(EMPTY_PROGRESS);
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey());
  const [activeDailyDate, setActiveDailyDate] = useState<string | null>(null);
  const [activeId, setActiveId] = useState(CHANNEL_PUZZLES[0].id);
  const [activeCatalogId, setActiveCatalogId] = useState(CATALOGS[0].id);
  const [board, setBoard] = useState<Board>(() => createBoard(CHANNEL_PUZZLES[0]));
  const [sumSelection, setSumSelection] = useState<CellCoord[]>([]);
  const [squareBoard, setSquareBoard] = useState<number[][]>(() =>
    createSquareBoard(
      PUZZLES.find((puzzle): puzzle is SquarePuzzle => puzzle.mode === 'squares')!,
    ),
  );
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const hasWon = useRef(false);

  const activePuzzle =
    PUZZLES.find((puzzle) => puzzle.id === activeId) ?? CHANNEL_PUZZLES[0];
  const activeCatalog =
    CATALOGS.find((catalog) => catalog.id === activeCatalogId) ?? CATALOGS[0];
  const dailyPuzzle = useMemo(() => getDailyPuzzle(todayKey), [todayKey]);
  const flow = useMemo(
    () =>
      activePuzzle.mode === 'channels'
        ? traceCurrent(board, activePuzzle)
        : { visited: new Set<string>(), connected: false },
    [board, activePuzzle],
  );
  const boardSize = Math.min(Dimensions.get('window').width - 40, 370);
  const cellSize = Math.floor((boardSize - 28 - 32) / BOARD_SIZE);
  const dailyStreak = getDailyStreak(progress.dailyCompletedDates, todayKey);
  const dailyCompletedToday = progress.dailyCompletedDates.includes(todayKey);
  const completedCount = progress.completed.filter((id) =>
    PUZZLES.some((puzzle) => puzzle.id === id),
  ).length;

  const refreshToday = useCallback(() => {
    const currentDateKey = getLocalDateKey();
    setTodayKey((storedDateKey) =>
      storedDateKey === currentDateKey ? storedDateKey : currentDateKey,
    );
  }, []);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshToday();
    });
    const dayRefreshInterval = setInterval(refreshToday, 60_000);
    return () => {
      appStateSubscription.remove();
      clearInterval(dayRefreshInterval);
    };
  }, [refreshToday]);

  const loadSavedProgress = useCallback(async () => {
    setLoadState('loading');
    try {
      const stored = await readProgress();
      setProgress(stored);
      const nextPuzzle =
        CHANNEL_PUZZLES.find((puzzle) => !stored.completed.includes(puzzle.id)) ??
        CHANNEL_PUZZLES[0];
      setActiveId(nextPuzzle.id);
      setActiveCatalogId(nextPuzzle.catalogId);
      setBoard(createBoard(nextPuzzle));
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    void loadSavedProgress();
  }, [loadSavedProgress]);

  const startPuzzle = (puzzle: Puzzle, dailyDate?: string) => {
    hasWon.current = false;
    setActiveDailyDate(dailyDate ?? null);
    setActiveId(puzzle.id);
    setActiveCatalogId(puzzle.catalogId);
    if (puzzle.mode === 'channels') setBoard(createBoard(puzzle));
    if (puzzle.mode === 'sum') setSumSelection([]);
    if (puzzle.mode === 'squares') setSquareBoard(createSquareBoard(puzzle));
    setMoves(0);
    setWon(false);
    setSaveNotice('');
    setMode('game');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const completePuzzle = useCallback(
    async (finalMoves: number) => {
      if (hasWon.current) return;
      hasWon.current = true;
      setWon(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const previousBest = progress.bestMoves[activePuzzle.id];
      const updated: GameProgress = {
        completed: progress.completed.includes(activePuzzle.id)
          ? progress.completed
          : [...progress.completed, activePuzzle.id],
        bestMoves: {
          ...progress.bestMoves,
          [activePuzzle.id]:
            previousBest === undefined
              ? finalMoves
              : Math.min(previousBest, finalMoves),
        },
        dailyCompletedDates:
          activeDailyDate &&
          !progress.dailyCompletedDates.includes(activeDailyDate)
            ? [...progress.dailyCompletedDates, activeDailyDate]
            : progress.dailyCompletedDates,
      };
      setProgress(updated);
      setSaveNotice('');
      try {
        await writeProgress(updated);
      } catch {
        setSaveNotice('This win is shown here, but could not be saved on this device.');
      }
    },
    [activeDailyDate, activePuzzle.id, progress],
  );

  const turnTile = (row: number, column: number) => {
    if (activePuzzle.mode !== 'channels') return;
    if (won || !board[row]?.[column]) return;
    const nextBoard = rotateBoardTile(board, row, column);
    const nextMoves = moves + 1;
    setBoard(nextBoard);
    setMoves(nextMoves);
    setSaveNotice('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (traceCurrent(nextBoard, activePuzzle).connected) {
      void completePuzzle(nextMoves);
    }
  };

  const selectSumCell = (row: number, column: number) => {
    if (activePuzzle.mode !== 'sum' || won) return;
    const alreadySelected = sumSelection.some(
      ([selectedRow, selectedColumn]) =>
        selectedRow === row && selectedColumn === column,
    );
    if (!alreadySelected && sumSelection.length >= activePuzzle.chooseCount) return;

    const nextSelection = alreadySelected
      ? sumSelection.filter(
          ([selectedRow, selectedColumn]) =>
            selectedRow !== row || selectedColumn !== column,
        )
      : [...sumSelection, [row, column] as CellCoord];
    const nextMoves = moves + 1;
    setSumSelection(nextSelection);
    setMoves(nextMoves);
    setSaveNotice('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSumSolved(activePuzzle, nextSelection)) void completePuzzle(nextMoves);
  };

  const rotateSquare = (row: number, column: number) => {
    if (activePuzzle.mode !== 'squares' || won) return;
    const isFixed = activePuzzle.givens.some(
      ([givenRow, givenColumn]) => givenRow === row && givenColumn === column,
    );
    if (isFixed) return;
    const nextGrid = rotateSquareCell(squareBoard, row, column);
    const nextMoves = moves + 1;
    setSquareBoard(nextGrid);
    setMoves(nextMoves);
    setSaveNotice('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSquareGridSolved(nextGrid)) void completePuzzle(nextMoves);
  };

  const useHint = () => {
    if (won) return;
    if (activePuzzle.mode === 'channels') {
      const hint = getNextHintCell(board, activePuzzle);
      if (!hint) return;
      const [row, column] = hint;
      const tile = board[row][column];
      if (!tile) return;
      const cycle = tile.kind === 'straight' ? 2 : 4;
      const turns = (tile.targetRotation - tile.rotation + cycle) % cycle;
      let nextBoard = board;
      for (let turn = 0; turn < turns; turn += 1) {
        nextBoard = rotateBoardTile(nextBoard, row, column);
      }
      const nextMoves = moves + 1;
      setBoard(nextBoard);
      setMoves(nextMoves);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (traceCurrent(nextBoard, activePuzzle).connected) {
        void completePuzzle(nextMoves);
      }
    } else if (activePuzzle.mode === 'sum') {
      const nextSelection = getSumHintSelection(activePuzzle, sumSelection);
      if (nextSelection.length === sumSelection.length &&
          nextSelection.every((cell, index) =>
            cell[0] === sumSelection[index]?.[0] &&
            cell[1] === sumSelection[index]?.[1],
          )) return;
      const nextMoves = moves + 1;
      setSumSelection(nextSelection);
      setMoves(nextMoves);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (isSumSolved(activePuzzle, nextSelection)) {
        void completePuzzle(nextMoves);
      }
    } else {
      const hint = getNextSquareHintCell(squareBoard, activePuzzle);
      if (!hint) return;
      const [row, column] = hint;
      const nextGrid = squareBoard.map((line) => [...line]);
      nextGrid[row][column] = activePuzzle.solution[row][column];
      const nextMoves = moves + 1;
      setSquareBoard(nextGrid);
      setMoves(nextMoves);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (isSquareGridSolved(nextGrid)) void completePuzzle(nextMoves);
    }
  };

  const resetPuzzle = () => {
    hasWon.current = false;
    if (activePuzzle.mode === 'channels') setBoard(createBoard(activePuzzle));
    if (activePuzzle.mode === 'sum') setSumSelection([]);
    if (activePuzzle.mode === 'squares') setSquareBoard(createSquareBoard(activePuzzle));
    setMoves(0);
    setWon(false);
    setSaveNotice('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const nextPuzzle = () => {
    const currentIndex = activeCatalog.puzzles.findIndex(
      (puzzle) => puzzle.id === activeId,
    );
    const next = activeCatalog.puzzles[currentIndex + 1];
    if (next) startPuzzle(next);
    else setMode('catalog');
  };

  const safeTop = Platform.OS === 'web' ? 67 : insets.top + 8;
  const safeBottom = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 14);

  if (loadState === 'loading') {
    return (
      <View style={[styles.loading, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Opening the tide map…</Text>
      </View>
    );
  }

  if (loadState === 'error') {
    return (
      <View style={[styles.loading, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
        <Feather name="alert-circle" size={30} color={colors.accent} />
        <Text style={styles.loadingTitle}>Progress could not be opened</Text>
        <Text style={styles.bodyText}>Try loading your saved maps again.</Text>
        <Pressable style={styles.primaryButton} onPress={() => void loadSavedProgress()}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
      {mode === 'home' ? (
        <ScrollView
          contentContainerStyle={styles.homeContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <View style={styles.brandLockup}>
              <View style={styles.brandMark}>
                <Feather name="wind" size={17} color={colors.primaryForeground} />
              </View>
              <Text style={styles.brand}>TIDEGLASS</Text>
            </View>
            <View style={styles.progressPill}>
              <Feather name="award" size={14} color={colors.accent} />
              <Text style={styles.progressPillText}>{completedCount} / {PUZZLES.length}</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroOrb}>
              <View style={[styles.orbit, styles.orbitOne]} />
              <View style={[styles.orbit, styles.orbitTwo]} />
              <View style={styles.orbCore}>
                <Feather name="droplet" size={36} color={colors.primary} />
              </View>
              <View style={styles.orbSpark}>
                <Feather name="sun" size={14} color={colors.accent} />
              </View>
            </View>
            <Text style={styles.eyebrow}>A POCKET-SIZED LOGIC GAME</Text>
            <Text style={styles.heroTitle}>Find the way{'\n'}through.</Text>
            <Text style={styles.heroCopy}>
              Trace a current, balance shell values, or arrange the tide marks.
            </Text>
          </View>

          <Pressable
            testID="daily-challenge"
            accessibilityRole="button"
            accessibilityLabel={`Daily current, ${dailyPuzzle.title}, ${dailyStreak} day streak${dailyCompletedToday ? ', completed today' : ''}`}
            style={({ pressed }) => [styles.dailyCard, pressed && styles.pressed]}
            onPress={() => startPuzzle(dailyPuzzle, todayKey)}
          >
            <View style={styles.dailyCardTop}>
              <View style={styles.dailyLabelGroup}>
                <Feather name="droplet" size={14} color={colors.primary} />
                <Text style={styles.dailyEyebrow}>DAILY PUZZLE</Text>
              </View>
              <View style={styles.streakPill}>
                <Feather name="zap" size={12} color={colors.accent} />
                <Text style={styles.streakPillText}>
                  {dailyStreak > 0
                    ? `${dailyStreak} DAY STREAK`
                    : 'START A STREAK'}
                </Text>
              </View>
            </View>
            <Text style={styles.dailyDate}>{formatDateLabel(todayKey)}</Text>
            <View style={styles.dailyCardBottom}>
              <View style={styles.dailyCopy}>
            <Text style={styles.dailyTitle}>{dailyPuzzle.title}</Text>
                <Text style={styles.dailySubtitle}>
                  {dailyCompletedToday
                    ? 'Completed today · play again anytime'
                    : dailyPuzzle.description}
                </Text>
              </View>
              <View style={styles.dailyAction}>
                <Feather
                  name={dailyCompletedToday ? 'check' : 'arrow-up-right'}
                  size={19}
                  color={colors.primaryForeground}
                />
              </View>
            </View>
          </Pressable>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Puzzle catalogs</Text>
              <Text style={styles.sectionSubtitle}>
                Each collection plays by different rules.
              </Text>
            </View>
            <Feather name="layers" size={18} color={colors.mutedForeground} />
          </View>

          <View style={styles.catalogList}>
            {CATALOGS.map((catalog) => {
              const done = catalog.puzzles.filter((puzzle) =>
                progress.completed.includes(puzzle.id),
              ).length;
              const accent = getCatalogAccent(catalog, colors);
              return (
                <Pressable
                  key={catalog.id}
                  testID={`catalog-${catalog.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${catalog.title}, ${done} of ${catalog.puzzles.length} completed`}
                  onPress={() => {
                    setActiveCatalogId(catalog.id);
                    setMode('catalog');
                  }}
                  style={({ pressed }) => [styles.catalogCard, pressed && styles.pressed]}
                >
                  <View style={[styles.catalogIcon, { borderColor: accent }]}>
                    <Feather name={catalog.icon} size={19} color={accent} />
                  </View>
                  <View style={styles.catalogCardCopy}>
                    <Text style={styles.catalogCardTitle}>{catalog.title}</Text>
                    <Text style={styles.catalogCardDescription}>{catalog.description}</Text>
                    <Text style={[styles.catalogCardMeta, { color: accent }]}>
                      {catalog.puzzles.length} puzzles · {done} completed
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.footerNote}>Made for a slower moment.</Text>
        </ScrollView>
      ) : mode === 'catalog' ? (
        <ScrollView
          contentContainerStyle={styles.catalogContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.catalogNav}>
            <IconButton
              name="arrow-left"
              label="Back to puzzle catalogs"
              colors={colors}
              onPress={() => setMode('home')}
            />
            <Text style={styles.catalogNavLabel}>COLLECTION</Text>
            <View style={{ width: 42 }} />
          </View>

          <View style={styles.catalogIntro}>
            <View
              style={[
                styles.catalogDetailIcon,
                { borderColor: getCatalogAccent(activeCatalog, colors) },
              ]}
            >
              <Feather
                name={activeCatalog.icon}
                size={24}
                color={getCatalogAccent(activeCatalog, colors)}
              />
            </View>
            <Text
              style={[
                styles.catalogKicker,
                { color: getCatalogAccent(activeCatalog, colors) },
              ]}
            >
              {activeCatalog.puzzles.length} PUZZLES · ONE DISTINCT RULESET
            </Text>
            <Text style={styles.catalogTitle}>{activeCatalog.title}</Text>
            <Text style={styles.catalogDescription}>{activeCatalog.description}</Text>
            <View
              style={[
                styles.mechanicNote,
                { borderColor: getCatalogAccent(activeCatalog, colors) },
              ]}
            >
              <Text
                style={[
                  styles.mechanicNoteText,
                  { color: getCatalogAccent(activeCatalog, colors) },
                ]}
              >
                {activeCatalog.mechanic}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Choose a puzzle</Text>
              <Text style={styles.sectionSubtitle}>
                {activeCatalog.puzzles.filter((puzzle) =>
                  progress.completed.includes(puzzle.id),
                ).length}{' '}
                of {activeCatalog.puzzles.length} completed
              </Text>
            </View>
            <Feather name="list" size={18} color={colors.mutedForeground} />
          </View>

          <View style={styles.levelList}>
            {activeCatalog.puzzles.map((puzzle, index) => {
              const done = progress.completed.includes(puzzle.id);
              const best = progress.bestMoves[puzzle.id];
              return (
                <Pressable
                  key={puzzle.id}
                  testID={`puzzle-${puzzle.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${puzzle.title}${done ? ', completed' : ''}`}
                  onPress={() => startPuzzle(puzzle)}
                  style={({ pressed }) => [styles.levelRow, pressed && styles.pressed]}
                >
                  <View
                    style={[
                      styles.levelIndex,
                      done && {
                        backgroundColor: getCatalogAccent(activeCatalog, colors),
                      },
                    ]}
                  >
                    {done ? (
                      <Feather
                        name="check"
                        size={16}
                        color={activeCatalog.accent === 'accent'
                          ? colors.accentForeground
                          : colors.primaryForeground}
                      />
                    ) : (
                      <Text style={styles.levelIndexText}>
                        {String(index + 1).padStart(2, '0')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.levelCopy}>
                    <Text style={styles.levelTitle}>{puzzle.title}</Text>
                    <Text style={styles.levelSubtitle}>
                      {[
                        done ? 'Completed' : null,
                        best !== undefined ? `Best · ${best} moves` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || puzzle.description}
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.gameContent}>
          <View style={styles.gameHeader}>
            <IconButton
              name="arrow-left"
              label={`Back to ${activeCatalog.title}`}
              colors={colors}
              onPress={() => setMode('catalog')}
            />
            <View style={styles.gameTitleWrap}>
              <Text style={styles.gameKicker}>
                {activeDailyDate
                  ? 'DAILY PUZZLE'
                  : activeCatalog.title.toUpperCase()}
              </Text>
              <Text style={styles.gameTitle}>{activePuzzle.title}</Text>
            </View>
            <View style={styles.turnBadge}>
              <Text style={styles.turnNumber}>{moves}</Text>
              <Text style={styles.turnLabel}>MOVES</Text>
            </View>
          </View>

          <View style={styles.instructionBlock}>
            <Text style={styles.instructionTitle}>
              {activePuzzle.mode === 'channels'
                ? 'Guide the current'
                : activePuzzle.mode === 'sum'
                  ? `Reach ${activePuzzle.target}`
                  : 'Set the tide marks'}
            </Text>
            <Text style={styles.instructionCopy}>
              {activePuzzle.mode === 'channels'
                ? 'Turn channels to carry water from the spring through every shell to the pearl.'
                : activePuzzle.mode === 'sum'
                  ? `Choose exactly ${activePuzzle.chooseCount} shells whose values add to ${activePuzzle.target}.`
                  : 'Each row and column must contain one of each mark. Tap a tile to cycle it.'}
            </Text>
          </View>

          {activePuzzle.mode === 'channels' ? (
            <>
              <View style={[styles.boardFrame, { width: boardSize, height: boardSize }]}>
                {board.map((rowTiles, row) => (
                  <View key={`row-${row}`} style={styles.boardRow}>
                    {rowTiles.map((tile, column) => {
                      const isShell = activePuzzle.shells.some(
                        ([shellRow, shellColumn]) =>
                          shellRow === row && shellColumn === column,
                      );
                      return (
                        <GameCell
                          key={`${row}-${column}`}
                          tile={tile}
                          row={row}
                          column={column}
                          size={cellSize}
                          isFlowing={flow.visited.has(`${row},${column}`)}
                          isShell={isShell}
                          isSource={row === 2 && column === 0}
                          isPearl={row === 2 && column === BOARD_SIZE - 1}
                          colors={colors}
                          onPress={() => turnTile(row, column)}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>
                    {activePuzzle.shells.length} shells to collect
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <Feather name="rotate-cw" size={13} color={colors.mutedForeground} />
                  <Text style={styles.legendText}>Tap to turn a channel</Text>
                </View>
              </View>
            </>
          ) : activePuzzle.mode === 'sum' ? (
            <PearlSumBoard
              puzzle={activePuzzle}
              selected={sumSelection}
              colors={colors}
              boardWidth={boardSize}
              onToggle={selectSumCell}
            />
          ) : (
            <TidalSquareBoard
              puzzle={activePuzzle}
              grid={squareBoard}
              colors={colors}
              boardWidth={boardSize}
              onRotate={rotateSquare}
            />
          )}

          {won ? (
            <View style={styles.winPanel}>
              <View style={styles.winIcon}>
                <Feather
                  name={activePuzzle.mode === 'channels' ? 'sun' : activePuzzle.mode === 'sum' ? 'hash' : 'grid'}
                  size={20}
                  color={colors.primaryForeground}
                />
              </View>
              <View style={styles.winCopy}>
                <Text style={styles.winTitle}>
                  {activePuzzle.mode === 'channels'
                    ? 'The current found its way.'
                    : activePuzzle.mode === 'sum'
                      ? 'The pearl count is balanced.'
                      : 'The tide marks are in harmony.'}
                </Text>
                <Text style={styles.winSubtitle}>
                  {moves} {moves === 1 ? 'move' : 'moves'} · best {progress.bestMoves[activePuzzle.id] ?? moves}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  activeCatalog.puzzles[activeCatalog.puzzles.length - 1]?.id === activePuzzle.id
                    ? 'Return to catalog'
                    : 'Continue to next puzzle'
                }
                onPress={nextPuzzle}
                style={styles.winContinue}
              >
                <Feather name="arrow-right" size={19} color={colors.primaryForeground} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                testID="hint-button"
                onPress={useHint}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Feather name="sun" size={16} color={colors.accent} />
                <Text style={styles.secondaryButtonText}>
                  {activePuzzle.mode === 'channels'
                    ? 'Nudge a channel'
                    : activePuzzle.mode === 'sum'
                      ? 'Reveal a shell'
                      : 'Reveal a mark'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                testID="reset-button"
                onPress={resetPuzzle}
                style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
              >
                <Feather name="rotate-ccw" size={17} color={colors.mutedForeground} />
              </Pressable>
            </View>
          )}
          {saveNotice ? <Text style={styles.saveNotice}>{saveNotice}</Text> : null}
          <Text style={styles.smallHint}>
            {activePuzzle.mode === 'channels'
              ? 'A lit channel shows where the water can travel.'
              : activePuzzle.mode === 'sum'
                ? 'Tap a shell to add or remove it from your sum.'
                : 'Clue tiles are locked. Tap another mark to rotate it.'}
          </Text>
        </View>
      )}
    </View>
  );
}

function getCatalogAccent(
  catalog: PuzzleCatalog,
  colors: ReturnType<typeof useColors>,
): string {
  if (catalog.accent === 'accent') return colors.accent;
  if (catalog.accent === 'moonlit') return colors.moonlit;
  return colors.primary;
}

function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day)
    .toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase();
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      paddingHorizontal: 28,
      backgroundColor: colors.background,
    },
    loadingText: { color: colors.mutedForeground, fontSize: 15 },
    loadingTitle: { color: colors.foreground, fontSize: 20, fontWeight: '700' },
    homeContent: { paddingHorizontal: 22, paddingBottom: 28 },
    catalogContent: { paddingHorizontal: 22, paddingBottom: 28 },
    catalogNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    catalogNavLabel: {
      color: colors.mutedForeground,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1.8,
    },
    catalogIntro: { alignItems: 'center', paddingTop: 18, paddingBottom: 5 },
    catalogDetailIcon: {
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      borderWidth: 1,
      backgroundColor: colors.card,
      marginBottom: 14,
    },
    catalogKicker: {
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1.7,
    },
    catalogTitle: {
      color: colors.foreground,
      fontSize: 30,
      fontWeight: '700',
      letterSpacing: -0.5,
      textAlign: 'center',
      marginTop: 5,
    },
    catalogDescription: {
      color: colors.mutedForeground,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      maxWidth: 300,
      marginTop: 7,
    },
    mechanicNote: {
      width: '100%',
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginTop: 15,
      borderRadius: 15,
      borderWidth: 1,
      backgroundColor: colors.card,
    },
    mechanicNoteText: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 17,
      textAlign: 'center',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    brandMark: {
      width: 30,
      height: 30,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    brand: {
      color: colors.foreground,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 2.3,
    },
    progressPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: colors.card,
    },
    progressPillText: { color: colors.foreground, fontSize: 12, fontWeight: '600' },
    hero: { alignItems: 'center', paddingTop: 6, paddingBottom: 22 },
    heroOrb: {
      width: 148,
      height: 148,
      borderRadius: 74,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    orbit: {
      position: 'absolute',
      width: 112,
      height: 112,
      borderRadius: 56,
      borderWidth: 1,
      borderColor: colors.border,
    },
    orbitOne: { transform: [{ scaleX: 1.4 }, { rotate: '-28deg' }] },
    orbitTwo: { transform: [{ scaleX: 1.4 }, { rotate: '28deg' }] },
    orbCore: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
    },
    orbSpark: {
      position: 'absolute',
      right: 26,
      top: 31,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: colors.card,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 2.1,
      marginBottom: 8,
    },
    heroTitle: {
      color: colors.foreground,
      fontSize: 40,
      lineHeight: 43,
      fontWeight: '700',
      letterSpacing: -1.2,
      textAlign: 'center',
    },
    heroCopy: {
      color: colors.mutedForeground,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      maxWidth: 290,
      marginTop: 10,
    },
    dailyCard: {
      padding: 18,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dailyCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dailyLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    dailyEyebrow: {
      color: colors.primary,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1.5,
    },
    streakPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 14,
      backgroundColor: colors.secondary,
    },
    streakPillText: {
      color: colors.foreground,
      fontSize: 8,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    dailyDate: {
      color: colors.mutedForeground,
      fontSize: 8,
      fontWeight: '600',
      letterSpacing: 1.1,
      marginTop: 13,
      marginBottom: 7,
    },
    dailyCardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dailyCopy: { flex: 1, paddingRight: 12 },
    dailyTitle: { color: colors.foreground, fontSize: 21, fontWeight: '700' },
    dailySubtitle: { color: colors.mutedForeground, fontSize: 11, marginTop: 4 },
    dailyAction: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    playCard: {
      minHeight: 104,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 18,
      borderRadius: 22,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    nextMapCard: { marginTop: 10 },
    playCardCopy: { flex: 1, paddingRight: 10 },
    cardEyebrow: {
      color: colors.primary,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1.7,
      marginBottom: 6,
    },
    playCardTitle: { color: colors.foreground, fontSize: 20, fontWeight: '700' },
    playCardSubtitle: { color: colors.mutedForeground, fontSize: 12, marginTop: 4 },
    playButton: {
      width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      backgroundColor: colors.primary,
    },
    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 28,
      marginBottom: 11,
    },
    sectionTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700' },
    sectionSubtitle: { color: colors.mutedForeground, fontSize: 11, marginTop: 4 },
    catalogList: { gap: 10 },
    catalogCard: {
      minHeight: 100,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catalogIcon: {
      width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      borderWidth: 1,
      backgroundColor: colors.secondary,
      marginRight: 12,
    },
    catalogCardCopy: { flex: 1, paddingRight: 8 },
    catalogCardTitle: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
    catalogCardDescription: {
      color: colors.mutedForeground,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 3,
    },
    catalogCardMeta: {
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.3,
      marginTop: 6,
    },
    levelList: {
      borderRadius: 20,
      paddingHorizontal: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    levelRow: {
      minHeight: 70,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    levelIndex: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: colors.secondary,
      marginRight: 12,
    },
    levelIndexDone: { backgroundColor: colors.primary },
    levelIndexText: { color: colors.mutedForeground, fontSize: 11, fontWeight: '700' },
    levelCopy: { flex: 1 },
    levelTitle: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
    levelSubtitle: { color: colors.mutedForeground, fontSize: 11, marginTop: 4 },
    footerNote: {
      color: colors.mutedForeground,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 20,
      letterSpacing: 0.4,
    },
    pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
    gameContent: { flex: 1, alignItems: 'center', paddingHorizontal: 20 },
    gameHeader: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    gameTitleWrap: { flex: 1, alignItems: 'center' },
    gameKicker: {
      color: colors.primary,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1.6,
    },
    gameTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 2 },
    turnBadge: {
      minWidth: 46,
      alignItems: 'center',
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: colors.card,
    },
    turnNumber: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
    turnLabel: { color: colors.mutedForeground, fontSize: 7, fontWeight: '700', letterSpacing: 1 },
    instructionBlock: {
      width: '100%',
      alignItems: 'center',
      marginTop: 22,
      marginBottom: 17,
    },
    instructionTitle: { color: colors.foreground, fontSize: 21, fontWeight: '700' },
    instructionCopy: {
      color: colors.mutedForeground,
      fontSize: 13,
      lineHeight: 19,
      maxWidth: 310,
      textAlign: 'center',
      marginTop: 6,
    },
    boardFrame: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 26,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
    },
    boardRow: { flexDirection: 'row', gap: 8 },
    cell: {
      position: 'relative',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1,
    },
    sourceCell: { borderColor: colors.primary, borderWidth: 1.5 },
    pearlCell: { borderColor: colors.accent, borderWidth: 1.5 },
    endpointTag: {
      position: 'absolute',
      right: 3,
      top: 3,
      width: 15,
      height: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    sourceTag: { backgroundColor: colors.primary },
    pearlTag: { backgroundColor: colors.accent },
    shellDot: {
      position: 'absolute',
      left: 5,
      top: 5,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    legendRow: {
      flexDirection: 'row',
      gap: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 15,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 7, height: 7, borderRadius: 4 },
    legendText: { color: colors.mutedForeground, fontSize: 11 },
    actionRow: {
      width: '100%',
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    secondaryButtonText: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
    resetButton: {
      width: 50,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    winPanel: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      padding: 12,
      marginTop: 18,
      borderRadius: 18,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    winIcon: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: colors.primary,
    },
    winCopy: { flex: 1 },
    winTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
    winSubtitle: { color: colors.mutedForeground, fontSize: 11, marginTop: 4 },
    winContinue: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    saveNotice: {
      color: colors.accent,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 8,
    },
    smallHint: {
      color: colors.mutedForeground,
      fontSize: 10,
      marginTop: 12,
      textAlign: 'center',
    },
    bodyText: { color: colors.mutedForeground, fontSize: 14, textAlign: 'center' },
    primaryButton: {
      paddingHorizontal: 22,
      paddingVertical: 13,
      marginTop: 5,
      borderRadius: 15,
      backgroundColor: colors.primary,
    },
    primaryButtonText: { color: colors.primaryForeground, fontSize: 14, fontWeight: '700' },
  });
}
