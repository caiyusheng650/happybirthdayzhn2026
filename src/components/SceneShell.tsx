import { ReactNode } from 'react';
import { useGame } from '../game/state/GameContext';
import { audio } from '../game/audio/AudioEngine';
import { Hud } from './Hud';
import { LEVEL_ORDER } from '../game/state/store';
import { LevelId } from '../game/types';

interface SceneShellProps {
  title: string;
  levelId?: LevelId;
  children: ReactNode;
  status: 'playing' | 'win' | 'lose';
  countdown?: number;
  nextLevelTitle?: string | null;
  isLast?: boolean;
  onWin?: () => void;
  resultTitle?: string;
  resultSubtitle?: string;
  showHome?: boolean;
}

export function SceneShell({
  title,
  levelId,
  children,
  status,
  countdown = 0,
  nextLevelTitle,
  isLast = false,
  onWin,
  resultTitle,
  resultSubtitle,
  showHome = true,
}: SceneShellProps) {
  const { dispatch } = useGame();

  const goHome = () => {
    audio.play('click');
    dispatch({ type: 'GO', stage: 'level-select' });
  };

  const next = () => {
    audio.play('click');
    onWin?.();
  };

  const retry = () => {
    if (!levelId) return;
    audio.play('click');
    dispatch({ type: 'START_LEVEL', level: levelId });
  };

  return (
    <div className="game-root" id="share-root" style={{ position: 'relative', overflow: 'hidden' }}>
      <Hud onHome={goHome} showHome={showHome} title={title} />

      {children}

      {/* 结果遮罩 */}
      {status !== 'playing' && (
        <div
          className="bounce-in"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            background: 'rgba(58,31,13,0.45)',
            backdropFilter: 'blur(3px)',
            textAlign: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#fff7e0',
              border: '4px solid #3a1f0d',
              borderRadius: 24,
              padding: '24px 28px',
              maxWidth: 340,
              width: '100%',
              boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: 46 }}>
              {status === 'win' ? '🎉' : '😭'}
            </div>
            <h2 style={{ margin: '6px 0', fontSize: 26, color: status === 'win' ? '#ef476f' : '#3a1f0d' }}>
              {resultTitle || (status === 'win' ? '过关！' : '差一点…')}
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 15, opacity: 0.8 }}>
              {resultSubtitle ||
                (status === 'win' ? `获得 ${title} 的梦想之星！` : '再试一次吧！')}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {levelId && (
                <button className="btn-crayon" onClick={goHome}>
                  📋 关卡
                </button>
              )}
              {status === 'lose' && (
                <button className="btn-crayon primary" onClick={retry}>
                  🔄 重试
                </button>
              )}
              {status === 'win' && (
                <button className="btn-crayon primary" onClick={next}>
                  {goToNext(levelId) ? '马上进入下一关 ▶' : '🏆 去舞台'}
                </button>
              )}
            </div>
            {status === 'win' && countdown > 0 && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#3a1f0d', opacity: 0.75 }}>
                {nextLevelTitle && !isLast
                  ? `${nextLevelTitle} · ${countdown} 秒后自动进入`
                  : `🎉 ${countdown} 秒后自动进入终幕`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** 是否有下一关 */
function goToNext(levelId?: LevelId): boolean {
  if (!levelId) return true;
  const idx = LEVEL_ORDER.indexOf(levelId);
  return idx < LEVEL_ORDER.length - 1;
}