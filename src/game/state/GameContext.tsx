import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  ReactNode,
} from 'react';
import { GameState, Stage, LevelId } from '../types';
import {
  initialState,
  loadState,
  persistState,
  clearState,
  applyStarUnlock,
  LEVEL_ORDER,
} from './store';

type Action =
  | { type: 'GO'; stage: Stage }
  | { type: 'START_LEVEL'; level: LevelId }
  | { type: 'COMPLETE_LEVEL'; level: LevelId }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'RESET' };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'GO':
      return { ...state, stage: action.stage };
    case 'START_LEVEL':
      return {
        ...state,
        currentLevel: action.level,
        stage: 'playing',
        playNonce: state.playNonce + 1,
      };
    case 'COMPLETE_LEVEL': {
      let next = applyStarUnlock(state, action.level);
      return next;
    }
    case 'TOGGLE_MUTE':
      return { ...state, muted: !state.muted };
    case 'RESET': {
      clearState();
      return initialState();
    }
    default:
      return state;
  }
}

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  // 使用高阶函数避免每次重新执行 initialState/loadState
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  // 状态变化即写入存档
  useEffect(() => {
    persistState(state);
  }, [state]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

/** 获取游戏状态与 dispatch */
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame 必须在 GameProvider 内使用');
  return ctx;
}