import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import {
  BOARD_SIZE,
  Board,
  CellCoord,
  PipeTile,
  PUZZLES,
  Puzzle,
  connectorsFor,
  createBoard,
  getNextHintCell,
  rotateBoardTile,
  traceCurrent,
} from '@/lib/puzzles';
import {
  EMPTY_PROGRESS,
  GameProgress,
  readProgress,
  writeProgress,
} from '@/lib/progress';

type ScreenMode = 'home' | 'game';
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
  const [activeId, setActiveId] = useState(PUZZLES[0].id);
  const [board, setBoard] = useState<Board>(() => createBoard(PUZZLES[0]));
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const hasWon = useRef(false);

  const activePuzzle =
    PUZZLES.find((puzzle) => puzzle.id === activeId) ?? PUZZLES[0];
  const flow = useMemo(() => traceCurrent(board, activePuzzle), [board, activePuzzle]);
  const boardSize = Math.min(Dimensions.get('window').width - 40, 370);
  const cellSize = Math.floor((boardSize - 28 - 32) / BOARD_SIZE);
  const completedCount = progress.completed.filter((id) =>
    PUZZLES.some((puzzle) => puzzle.id === id),
  ).length;
  const isComplete = progress.completed.length >= PUZZLES.length;

  const loadSavedProgress = useCallback(async () => {
    setLoadState('loading');
    try {
      const stored = await readProgress();
      setProgress(stored);
      const nextPuzzle =
        PUZZLES.find((puzzle) => !stored.completed.includes(puzzle.id)) ??
        PUZZLES[0];
      setActiveId(nextPuzzle.id);
      setBoard(createBoard(nextPuzzle));
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    void loadSavedProgress();
  }, [loadSavedProgress]);

  const startPuzzle = (puzzle: Puzzle) => {
    hasWon.current = false;
    setActiveId(puzzle.id);
    setBoard(createBoard(puzzle));
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
      };
      setProgress(updated);
      setSaveNotice('');
      try {
        await writeProgress(updated);
      } catch {
        setSaveNotice('This win is shown here, but could not be saved on this device.');
      }
    },
    [activePuzzle.id, progress],
  );

  const turnTile = (row: number, column: number) => {
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

  const useHint = () => {
    if (won) return;
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
  };

  const resetPuzzle = () => {
    hasWon.current = false;
    setBoard(createBoard(activePuzzle));
    setMoves(0);
    setWon(false);
    setSaveNotice('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const nextPuzzle = () => {
    const currentIndex = PUZZLES.findIndex((puzzle) => puzzle.id === activeId);
    const next = PUZZLES[currentIndex + 1];
    if (next) startPuzzle(next);
    else setMode('home');
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
              Turn the channels. Gather every shell. Let the current reach the pearl.
            </Text>
          </View>

          <Pressable
            testID="play-today"
            accessibilityRole="button"
            style={({ pressed }) => [styles.playCard, pressed && styles.pressed]}
            onPress={() => startPuzzle(activePuzzle)}
          >
            <View style={styles.playCardCopy}>
              <Text style={styles.cardEyebrow}>{isComplete ? 'ALL MAPS OPEN' : 'YOUR NEXT MAP'}</Text>
              <Text style={styles.playCardTitle}>
                {isComplete ? 'Return to the tide' : activePuzzle.title}
              </Text>
              <Text style={styles.playCardSubtitle}>
                {isComplete ? 'Replay a favorite current' : activePuzzle.description}
              </Text>
            </View>
            <View style={styles.playButton}>
              <Feather name="arrow-up-right" size={21} color={colors.primaryForeground} />
            </View>
          </Pressable>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Tide maps</Text>
              <Text style={styles.sectionSubtitle}>
                {PUZZLES.length} currents, each with its own route.
              </Text>
            </View>
            <Feather name="map" size={18} color={colors.mutedForeground} />
          </View>

          <View style={styles.levelList}>
            {PUZZLES.map((puzzle, index) => {
              const done = progress.completed.includes(puzzle.id);
              const best = progress.bestMoves[puzzle.id];
              return (
                <Pressable
                  key={puzzle.id}
                  testID={`map-${puzzle.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${puzzle.title}${done ? ', completed' : ''}${best !== undefined ? `, best ${best} ${best === 1 ? 'turn' : 'turns'}` : ''}`}
                  onPress={() => startPuzzle(puzzle)}
                  style={({ pressed }) => [styles.levelRow, pressed && styles.pressed]}
                >
                  <View style={[styles.levelIndex, done && styles.levelIndexDone]}>
                    {done ? (
                      <Feather name="check" size={16} color={colors.primaryForeground} />
                    ) : (
                      <Text style={styles.levelIndexText}>0{index + 1}</Text>
                    )}
                  </View>
                  <View style={styles.levelCopy}>
                    <Text style={styles.levelTitle}>{puzzle.title}</Text>
                    <Text style={styles.levelSubtitle}>
                      {[
                        done ? 'Completed' : null,
                        best !== undefined
                          ? `Best · ${best} ${best === 1 ? 'turn' : 'turns'}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || puzzle.description}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.footerNote}>Made for a slower moment.</Text>
        </ScrollView>
      ) : (
        <View style={styles.gameContent}>
          <View style={styles.gameHeader}>
            <IconButton
              name="arrow-left"
              label="Back to tide maps"
              colors={colors}
              onPress={() => setMode('home')}
            />
            <View style={styles.gameTitleWrap}>
              <Text style={styles.gameKicker}>MAP {String(PUZZLES.indexOf(activePuzzle) + 1).padStart(2, '0')}</Text>
              <Text style={styles.gameTitle}>{activePuzzle.title}</Text>
            </View>
            <View style={styles.turnBadge}>
              <Text style={styles.turnNumber}>{moves}</Text>
              <Text style={styles.turnLabel}>TURNS</Text>
            </View>
          </View>

          <View style={styles.instructionBlock}>
            <Text style={styles.instructionTitle}>Guide the current</Text>
            <Text style={styles.instructionCopy}>
              Turn each channel to carry water from the spring through every shell to the pearl.
            </Text>
          </View>

          <View style={[styles.boardFrame, { width: boardSize, height: boardSize }]}>
            {board.map((rowTiles, row) => (
              <View key={`row-${row}`} style={styles.boardRow}>
                {rowTiles.map((tile, column) => {
                  const isShell = activePuzzle.shells.some(
                    ([shellRow, shellColumn]) => shellRow === row && shellColumn === column,
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
              <Text style={styles.legendText}>{activePuzzle.shells.length} shells</Text>
            </View>
            <View style={styles.legendItem}>
              <Feather name="rotate-cw" size={13} color={colors.mutedForeground} />
              <Text style={styles.legendText}>Tap a channel to turn it</Text>
            </View>
          </View>

          {won ? (
            <View style={styles.winPanel}>
              <View style={styles.winIcon}>
                <Feather name="sun" size={20} color={colors.primaryForeground} />
              </View>
              <View style={styles.winCopy}>
                <Text style={styles.winTitle}>The current found its way.</Text>
                <Text style={styles.winSubtitle}>
                  {moves} {moves === 1 ? 'turn' : 'turns'} · your best is {progress.bestMoves[activePuzzle.id] ?? moves}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={PUZZLES.indexOf(activePuzzle) < PUZZLES.length - 1 ? 'Continue to next map' : 'Return to maps'}
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
                <Text style={styles.secondaryButtonText}>Nudge a channel</Text>
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
            A lit channel shows where the water can travel.
          </Text>
        </View>
      )}
    </View>
  );
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
