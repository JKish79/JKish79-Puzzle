import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { CellCoord, SquarePuzzle, SumPuzzle, sumSelected } from '@/lib/puzzles';

type ThemeColors = ReturnType<typeof useColors>;

const PHASE_ICONS: React.ComponentProps<typeof Feather>['name'][] = [
  'circle',
  'moon',
  'sun',
  'wind',
];
const PHASE_NAMES = ['Still', 'Crescent', 'High', 'Swell'];

export function PearlSumBoard({
  puzzle,
  selected,
  colors,
  boardWidth,
  onToggle,
}: {
  puzzle: SumPuzzle;
  selected: CellCoord[];
  colors: ThemeColors;
  boardWidth: number;
  onToggle: (row: number, column: number) => void;
}) {
  const styles = useMemo(() => makeBoardStyles(colors), [colors]);
  const total = sumSelected(puzzle, selected);
  const tileSize = Math.floor((boardWidth - 36 - 24) / 4);

  return (
    <View style={[styles.sumCard, { width: boardWidth }]}>
      <View style={styles.sumGoal}>
        <View>
          <Text style={styles.sumEyebrow}>TARGET</Text>
          <Text style={styles.sumTarget}>{puzzle.target}</Text>
        </View>
        <View style={styles.sumDivider} />
        <View>
          <Text style={styles.sumEyebrow}>YOUR PICKS</Text>
          <Text style={styles.sumProgress}>
            {selected.length}/{puzzle.chooseCount}
            <Text style={styles.sumTotal}> · {total} total</Text>
          </Text>
        </View>
      </View>
      <View style={styles.sumGrid}>
        {puzzle.values.map((rowValues, row) => (
          <View key={`sum-row-${row}`} style={styles.sumRow}>
            {rowValues.map((value, column) => {
              const isSelected = selected.some(
                ([selectedRow, selectedColumn]) =>
                  selectedRow === row && selectedColumn === column,
              );
              return (
                <Pressable
                  key={`${row}-${column}`}
                  testID={`sum-cell-${row}-${column}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${value}, row ${row + 1}, column ${column + 1}${isSelected ? ', selected' : ''}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onToggle(row, column)}
                  style={({ pressed }) => [
                    styles.sumTile,
                    {
                      width: tileSize,
                      height: tileSize,
                      backgroundColor: isSelected ? colors.accent : colors.boardCell,
                      borderColor: isSelected ? colors.accent : colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.sumValue, isSelected && styles.sumValueSelected]}>
                    {value}
                  </Text>
                  {isSelected ? (
                    <View style={styles.selectionCheck}>
                      <Feather name="check" size={9} color={colors.accentForeground} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Text style={styles.sumCaption}>
        Choose {puzzle.chooseCount} shells. Any exact match opens the pearl.
      </Text>
    </View>
  );
}

export function TidalSquareBoard({
  puzzle,
  grid,
  colors,
  boardWidth,
  onRotate,
}: {
  puzzle: SquarePuzzle;
  grid: number[][];
  colors: ThemeColors;
  boardWidth: number;
  onRotate: (row: number, column: number) => void;
}) {
  const styles = useMemo(() => makeBoardStyles(colors), [colors]);
  const tileSize = Math.floor((boardWidth - 36 - 24) / 4);
  const givenKeys = new Set(puzzle.givens.map(([row, column]) => `${row},${column}`));
  const phaseColors = [colors.primary, colors.accent, colors.moonlit, colors.success];

  return (
    <View style={[styles.squareCard, { width: boardWidth }]}>
      <View style={styles.squareRule}>
        <Feather name="grid" size={15} color={colors.moonlit} />
        <Text style={styles.squareRuleText}>One of each mark in every row and column</Text>
      </View>
      <View style={styles.squareGrid}>
        {grid.map((rowValues, row) => (
          <View key={`square-row-${row}`} style={styles.squareRow}>
            {rowValues.map((value, column) => {
              const fixed = givenKeys.has(`${row},${column}`);
              return (
                <Pressable
                  key={`${row}-${column}`}
                  testID={`square-cell-${row}-${column}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${PHASE_NAMES[value]} mark, row ${row + 1}, column ${column + 1}${fixed ? ', fixed clue' : ', tap to rotate'}`}
                  accessibilityState={{ disabled: fixed }}
                  disabled={fixed}
                  onPress={() => onRotate(row, column)}
                  style={({ pressed }) => [
                    styles.squareTile,
                    {
                      width: tileSize,
                      height: tileSize,
                      borderColor: fixed ? colors.border : colors.moonlit,
                      backgroundColor: fixed ? colors.boardCell : colors.secondary,
                      opacity: pressed ? 0.74 : 1,
                    },
                  ]}
                >
                  <Feather name={PHASE_ICONS[value]} size={20} color={phaseColors[value]} />
                  <Text style={styles.phaseName}>{PHASE_NAMES[value]}</Text>
                  {fixed ? (
                    <View style={styles.fixedMark}>
                      <Feather name="lock" size={7} color={colors.mutedForeground} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.phaseLegend}>
        {PHASE_ICONS.map((icon, index) => (
          <View key={PHASE_NAMES[index]} style={styles.phaseLegendItem}>
            <Feather name={icon} size={12} color={phaseColors[index]} />
            <Text style={styles.phaseLegendText}>{PHASE_NAMES[index]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function makeBoardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sumCard: {
      alignItems: 'center',
      padding: 14,
      borderRadius: 24,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sumGoal: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingVertical: 5,
      marginBottom: 12,
    },
    sumEyebrow: {
      color: colors.mutedForeground,
      fontSize: 8,
      fontWeight: '700',
      letterSpacing: 1.2,
    },
    sumTarget: { color: colors.accent, fontSize: 27, fontWeight: '700', marginTop: 2 },
    sumDivider: {
      width: 1,
      height: 37,
      backgroundColor: colors.border,
      marginHorizontal: 10,
    },
    sumProgress: { color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 7 },
    sumTotal: { color: colors.mutedForeground, fontSize: 12, fontWeight: '500' },
    sumGrid: { gap: 8 },
    sumRow: { flexDirection: 'row', gap: 8 },
    sumTile: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 1,
    },
    sumValue: { color: colors.foreground, fontSize: 20, fontWeight: '700' },
    sumValueSelected: { color: colors.accentForeground },
    selectionCheck: {
      position: 'absolute',
      right: 4,
      top: 4,
      width: 14,
      height: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 7,
      backgroundColor: colors.accent,
    },
    sumCaption: {
      color: colors.mutedForeground,
      fontSize: 10,
      marginTop: 12,
      textAlign: 'center',
    },
    squareCard: {
      alignItems: 'center',
      padding: 14,
      borderRadius: 24,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    squareRule: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 6,
      marginBottom: 14,
    },
    squareRuleText: {
      color: colors.mutedForeground,
      fontSize: 10,
      textAlign: 'center',
    },
    squareGrid: { gap: 8 },
    squareRow: { flexDirection: 'row', gap: 8 },
    squareTile: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      borderWidth: 1,
      gap: 3,
    },
    phaseName: { color: colors.foreground, fontSize: 7, fontWeight: '600' },
    fixedMark: {
      position: 'absolute',
      right: 4,
      top: 4,
      width: 12,
      height: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
      backgroundColor: colors.emptyCell,
    },
    phaseLegend: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 12,
    },
    phaseLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    phaseLegendText: { color: colors.mutedForeground, fontSize: 8 },
  });
}
