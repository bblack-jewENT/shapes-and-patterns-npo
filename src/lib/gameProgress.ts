export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readLocalGameProgress<T>(
  key: string,
  isValid: (value: unknown) => value is T
): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const saved = window.localStorage.getItem(key);
    if (saved === null) return null;

    const value: unknown = JSON.parse(saved);
    if (!isValid(value)) {
      console.warn(`Ignoring invalid saved game progress for "${key}".`);
      return null;
    }
    return value;
  } catch (error) {
    console.error(`Unable to read saved game progress for "${key}".`, error);
    return null;
  }
}

export function saveLocalGameProgress(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Unable to save game progress for "${key}".`, error);
  }
}

export function readLocalHighScore(key: string): number {
  if (typeof window === 'undefined') return 0;

  try {
    const saved = window.localStorage.getItem(key);
    if (saved === null) return 0;

    const score = Number(saved);
    if (!Number.isSafeInteger(score) || score < 0) {
      console.warn(`Ignoring invalid saved high score for "${key}".`);
      return 0;
    }
    return score;
  } catch (error) {
    console.error(`Unable to read saved high score for "${key}".`, error);
    return 0;
  }
}

export function saveLocalHighScore(key: string, score: number): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, String(score));
  } catch (error) {
    console.error(`Unable to save high score for "${key}".`, error);
  }
}
