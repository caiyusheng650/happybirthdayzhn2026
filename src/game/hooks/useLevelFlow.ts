import { useEffect, useRef, useState } from 'react';
import { useGame } from '../state/GameContext';
import { audio } from '../audio/AudioEngine';
import { LEVEL_ORDER } from '../state/store';
import { LEVEL_MAP } from '../config';
import { LevelId } from '../types';

export type LevelStatus = 'playing' | 'win' | 'lose';

const AUTO_ADVANCE_DELAY = 2500; // 胜利后 2.5 秒自动进入下一关

/** 关卡通用流程：胜利/失败/导航下一关 */
export function useLevelFlow(levelId: LevelId) {
  const { dispatch } = useGame();
  const [status, setStatus] = useState<LevelStatus>('playing');
  const [countdown, setCountdown] = useState(0);
  const wonRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, []);

  const win = () => {
    if (wonRef.current) return;
    wonRef.current = true;
    audio.play('victory');
    dispatch({ type: 'COMPLETE_LEVEL', level: levelId });
    setStatus('win');

    // 倒计时
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remain = Math.max(0, Math.ceil((AUTO_ADVANCE_DELAY - elapsed) / 1000));
      setCountdown(remain);
    };
    tick();
    const interval = window.setInterval(tick, 200);

    timerRef.current = window.setTimeout(() => {
      window.clearInterval(interval);
      onWin();
    }, AUTO_ADVANCE_DELAY);
  };

  const lose = () => {
    if (wonRef.current) return;
    audio.play('bad');
    setStatus('lose');
  };

  const onWin = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const idx = LEVEL_ORDER.indexOf(levelId);
    if (idx < LEVEL_ORDER.length - 1) {
      dispatch({ type: 'START_LEVEL', level: LEVEL_ORDER[idx + 1] });
    } else {
      dispatch({ type: 'GO', stage: 'finale' });
    }
  };

  const goNextNow = () => {
    audio.play('click');
    onWin();
  };

  const nextLevelTitle = (() => {
    const idx = LEVEL_ORDER.indexOf(levelId);
    if (idx < 0 || idx >= LEVEL_ORDER.length - 1) return null;
    const nextId = LEVEL_ORDER[idx + 1];
    return LEVEL_MAP[nextId]?.title ?? null;
  })();
  const isLast = LEVEL_ORDER.indexOf(levelId) === LEVEL_ORDER.length - 1;

  return { status, countdown, win, lose, onWin: goNextNow, nextLevelTitle, isLast };
}
