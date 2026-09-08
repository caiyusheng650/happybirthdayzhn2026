import { useGame } from '../game/state/GameContext';
import { audio } from '../game/audio/AudioEngine';
import { StarIcon } from './StarIcon';
import { LEVELS } from '../game/config';

interface HudProps {
  onHome?: () => void;
  showHome?: boolean;
  title?: string;
}

export function Hud({ onHome, showHome = true, title }: HudProps) {
  const { state, dispatch } = useGame();

  const toggleMute = () => {
    audio.ensure();
    const next = !state.muted;
    audio.setMuted(next);
    dispatch({ type: 'TOGGLE_MUTE' });
  };

  return (
    <div className="hud">
      <div className="star-counter" title={`已收集 ${state.totalStars}/4 颗星`}>
        <StarIcon size={18} />
        <span>{state.totalStars}/{LEVELS.length}</span>
      </div>
      {title && (
        <span
          style={{ fontSize: 17, fontWeight: 'bold', textShadow: '1px 1px 0 #fff' }}
        >
          {title}
        </span>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="hud-icon-btn"
          onClick={toggleMute}
          title={state.muted ? '开启声音' : '静音'}
          aria-label="声音开关"
        >
          {state.muted ? '🔇' : '🔊'}
        </button>
        {showHome && onHome && (
          <button className="hud-icon-btn" onClick={onHome} title="返回主页" aria-label="返回主页">
            🏠
          </button>
        )}
      </div>
    </div>
  );
}