import { GameState, LevelId } from '../types';

// localStorage 存档 key
const STORAGE_KEY = 'dreamstar-save-v1';

/** 生成初始状态 */
export function initialState(): GameState {
  return {
    stage: 'start',
    currentLevel: null,
    playNonce: 0,
    unlockedStars: { jump: false, beam: false, memory: false, rhythm: false, aim: false },
    totalStars: 0,
    muted: false,
    completed: false,
  };
}

/** 从 localStorage 读取存档 */
export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const base = initialState();
    return {
      ...base,
      ...parsed,
      unlockedStars: { ...base.unlockedStars, ...(parsed.unlockedStars || {}) },
    };
  } catch {
    return initialState();
  }
}

/** 写入存档 */
export function persistState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 忽略写入失败 */
  }
}

/** 清空存档 */
export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** 关卡顺序 */
export const LEVEL_ORDER: LevelId[] = ['jump', 'beam', 'memory', 'rhythm', 'aim'];

/** 关卡是否解锁（顺序解锁） */
export function isLevelUnlocked(state: GameState, id: LevelId): boolean {
  const idx = LEVEL_ORDER.indexOf(id);
  if (idx === 0) return true;
  const prev = LEVEL_ORDER[idx - 1];
  return state.unlockedStars[prev] === true;
}

/** 标记某关通关，返回新状态 */
export function applyStarUnlock(
  state: GameState,
  id: LevelId
): GameState {
  const next = {
    ...state,
    unlockedStars: { ...state.unlockedStars, [id]: true },
  };
  next.totalStars = LEVEL_ORDER.filter((l) => next.unlockedStars[l]).length;
  return next;
}