import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tideglass-progress-v1';

export type GameProgress = {
  completed: string[];
  bestMoves: Record<string, number>;
  dailyCompletedDates: string[];
};

export const EMPTY_PROGRESS: GameProgress = {
  completed: [],
  bestMoves: {},
  dailyCompletedDates: [],
};

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function getDailyStreak(
  completedDates: readonly string[],
  todayKey: string,
): number {
  if (!isDateKey(todayKey)) return 0;

  const completed = new Set(completedDates);
  let dateKey = completed.has(todayKey) ? todayKey : shiftDateKey(todayKey, -1);
  if (!completed.has(dateKey)) return 0;

  let streak = 0;
  while (completed.has(dateKey)) {
    streak += 1;
    dateKey = shiftDateKey(dateKey, -1);
  }
  return streak;
}

export async function readProgress(): Promise<GameProgress> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return EMPTY_PROGRESS;

  const parsed: unknown = JSON.parse(stored);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('completed' in parsed) ||
    !Array.isArray(parsed.completed) ||
    !('bestMoves' in parsed) ||
    typeof parsed.bestMoves !== 'object' ||
    parsed.bestMoves === null
  ) {
    throw new Error('Saved game progress is not in a readable format.');
  }

  return {
    completed: parsed.completed.filter(
      (value): value is string => typeof value === 'string',
    ),
    bestMoves: Object.fromEntries(
      Object.entries(parsed.bestMoves).filter(
        (entry): entry is [string, number] =>
          typeof entry[0] === 'string' && typeof entry[1] === 'number',
      ),
    ),
    dailyCompletedDates:
      'dailyCompletedDates' in parsed &&
      Array.isArray(parsed.dailyCompletedDates)
        ? parsed.dailyCompletedDates.filter(isDateKey)
        : [],
  };
}

export async function writeProgress(progress: GameProgress): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
