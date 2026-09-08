import { useEffect } from 'react';
import { useGame } from '../game/state/GameContext';
import { audio } from '../game/audio/AudioEngine';
import { ImageShinchan } from '../game/entities/ImageShinchan';

// 顶部飘落彩带粒子
const PARTICLES = Array.from({ length: 14 }, () => ({
  left: Math.random() * 100,
  delay: Math.random() * 4,
  dur: 6 + Math.random() * 6,
  color: ['#ef476f', '#06d6a0', '#ffd166', '#118ab2', '#ff9f1c'][Math.floor(Math.random() * 5)],
  size: 8 + Math.random() * 10,
  rot: Math.random() * 360,
}));

export function StartScreen() {
  const { state, dispatch } = useGame();

  // 进场音频解锁
  useEffect(() => {
    audio.ensure();
  }, []);

  useEffect(() => {
    // 首屏播放欢快串音
    const t = setTimeout(() => audio.play('victory'), 400);
    return () => clearTimeout(t);
  }, []);

  const goLevelSelect = () => {
    audio.play('click');
    dispatch({ type: 'GO', stage: 'level-select' });
  };

  return (
    <div className="game-root" id="share-root" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20 }}>
      {/* 彩带 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: p.left + '%',
              top: 0,
              width: p.size,
              height: p.size * 0.5,
              background: p.color,
              borderRadius: 2,
              opacity: 0.85,
              animation: `confettiFall ${p.dur}s linear ${p.delay}s infinite`,
              transform: `rotate(${p.rot}deg)`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10vh) rotate(0deg); }
          100% { transform: translateY(110vh) rotate(720deg); }
        }
      `}</style>

      {/* 角色 */}
      <div className="bounce-in" style={{ marginBottom: 4 }}>
        <ImageShinchan size={200} />
      </div>

      <h1
        className="crayon-text"
        style={{
          fontSize: 'clamp(30px, 7vw, 52px)',
          margin: '4px 0',
          color: '#ef476f',
          letterSpacing: 2,
          textShadow: '2px 2px 0 #ffd166',
        }}
      >
        嗨起来！星星大作战
      </h1>
      <p style={{ fontSize: 'clamp(18px, 4vw, 24px)', margin: '0 0 6px', color: '#3a1f0d' }}>
        你的生日愿望会实现！和野原新之助一起，
      </p>
      <p style={{ fontSize: 16, margin: '0 0 18px', color: '#3a1f0d', opacity: 0.8 }}>
        收集 5 颗梦想星星，嗨起来大作战 ✨
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn-crayon primary" onClick={goLevelSelect}>
          {state.unlockedStars && Object.values(state.unlockedStars).some(Boolean) ? '继续游戏 ▶' : '开始冒险 ▶'}
        </button>
      </div>
      <p style={{ marginTop: 14, fontSize: 14, opacity: 0.6 }}>💾 已自动保存进度 · 🔊 记得开声音</p>
    </div>
  );
}