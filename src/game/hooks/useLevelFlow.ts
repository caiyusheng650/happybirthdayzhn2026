import { useRef, useState } from 'react';
import { useGame } from '../state/GameContext';
import { audio } from '../audio/AudioEngine';
import { LEVEL_ORDER } from '../state/store';
import { LevelId } from '../types';

export type LevelStatus = 'playing' | 'win' | 'lose';

/** 关卡通用流程：胜利/失败/导航下一关 */
export function useLevelFlow(levelId: LevelId) {
  const { dispatch } = useGame();
  const [status, setStatus] = useState<LevelStatus>('playing');
  const wonRef = useRef(false);

  const win = () => {
    if (wonRef.current) return;
    wonRef.current = true;
    audio.play('victory');
    dispatch({ type: 'COMPLETE_LEVEL', level: levelId });
    setStatus('win');
  };

  const lose = () => {
    if (wonRef.current) return;
    audio.play('bad');
    setStatus('lose');
  };

  const onWin = () => {
    const idx = LEVEL_ORDER.indexOf(levelId);
    if (idx < LEVEL_ORDER.length - 1) {
      dispatch({ type: 'START_LEVEL', level: LEVEL_ORDER[idx + 1] });
    } else {
      dispatch({ type: 'GO', stage: 'level-select' });
    }
  };

  return { status, win, lose, onWin };
}