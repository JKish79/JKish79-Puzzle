import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tideglass-progress-v1';

export type GameProgress = {
  completed: string[];
  bestMoves: Record<string, number>;
};

export const EMPTY_PROGRESS: GameProgress = {
  completed: [],
  bestMoves: {},
};

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
  };
}

export async function writeProgress(progress: GameProgress): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
