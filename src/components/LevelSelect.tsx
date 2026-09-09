import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/state/GameContext';
import { LEVELS, LEVEL_MAP } from '../game/config';
import { isLevelUnlocked } from '../game/state/store';
import { audio } from '../game/audio/AudioEngine';
import { StarIcon } from './StarIcon';
import { LEVEL_ORDER } from '../game/state/store';

export function LevelSelect() {
  const { state, dispatch } = useGame();
  const finaleUnlocked = state.totalStars === LEVEL_ORDER.length;

  // 刚解锁星星的 Toast：检测 unlockedStars 变化
  const [toast, setToast] = useState<string | null>(null);
  const prevStarsRef = useRef<Record<string, boolean>>({});
  const toastTimerRef = useRef<number | null>(null);
  useEffect(() => {
    for (const lv of LEVEL_ORDER) {
      const wasDone = prevStarsRef.current[lv];
      const nowDone = state.unlockedStars[lv];
      if (!wasDone && nowDone) {
        const title = LEVEL_MAP[lv]?.title ?? lv;
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        setToast(`🎉 ${title} 通关！获得梦想之星！`);
        toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
      }
    }
    prevStarsRef.current = { ...state.unlockedStars };
    return () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.unlockedStars]);

  const start = (id: string) => {
    audio.ensure();
    audio.play('click');
    dispatch({ type: 'START_LEVEL', level: id as never });
  };

  const reset = () => {
    if (!window.confirm('确定要清空所有进度吗？')) return;
    audio.play('bad');
    dispatch({ type: 'RESET' });
  };

  return (
    <div className="game-root" id="share-root" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '70px 16px 30px', position: 'relative' }}>
      {toast && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            background: 'linear-gradient(135deg, #ffd166 0%, #ff9a8b 100%)',
            border: '3px solid #3a1f0d',
            borderRadius: 20,
            padding: '10px 22px',
            fontSize: 17,
            fontWeight: 'bold',
            color: '#3a1f0d',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
            animation: 'bounce-in 0.5s ease',
          }}
        >
          {toast}
        </div>
      )}
      <h1 className="crayon-text" style={{ fontSize: 'clamp(26px,6vw,40px)', margin: '0 0 4px', color: '#ef476f' }}>
        选择冒险关卡
      </h1>
      <p style={{ margin: '0 0 16px', fontSize: 16 }}>收集全部星星，嗨起来！🌠</p>

      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {LEVELS.map((lv) => {
          const done = state.unlockedStars[lv.id];
          const unlocked = isLevelUnlocked(state, lv.id);
          return (
            <button
              key={lv.id}
              className="btn-crayon"
              onClick={() => unlocked && start(lv.id)}
              disabled={!unlocked}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                textAlign: 'left',
                justifyContent: 'space-between',
                fontSize: 20,
                background: unlocked ? '#ffd166' : '#e8d9b8',
                opacity: unlocked ? 1 : 0.55,
                cursor: unlocked ? 'pointer' : 'not-allowed',
              }}
            >
              <span style={{ fontSize: 28 }}>{lv.emoji}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 'bold' }}>
                  {lv.title} {done ? '✓' : ''}
                </span>
                <span style={{ fontSize: 13, opacity: 0.75 }}>{lv.subtitle}</span>
              </span>
              {done ? <StarIcon size={26} /> : <span style={{ fontSize: 20 }}>{unlocked ? '▶' : '🔒'}</span>}
            </button>
          );
        })}

        {/* 终幕舞台 */}
        <button
          className="btn-crayon primary"
          onClick={() => finaleUnlocked && dispatch({ type: 'GO', stage: 'finale' })}
          disabled={!finaleUnlocked}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            justifyContent: 'center',
            fontSize: 22,
            marginTop: 6,
            opacity: finaleUnlocked ? 1 : 0.55,
          }}
        >
          <span>🎤</span>
          <span>嗨起来！终极舞台</span>
          <span>{finaleUnlocked ? '🌟' : '🔒'}</span>
        </button>
        {!finaleUnlocked && (
          <p style={{ textAlign: 'center', fontSize: 13, opacity: 0.7, margin: 0 }}>
            集齐 3 颗星即可进入终极舞台
          </p>
        )}
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
        <button className="btn-crayon" onClick={() => dispatch({ type: 'GO', stage: 'start' })}>
          ⬅ 返回
        </button>
        <button className="btn-crayon" onClick={reset} style={{ background: '#f7d9d0' }}>
          🗑 重置
        </button>
      </div>
    </div>
  );
}