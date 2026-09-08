import { useEffect, useMemo, useRef, useState } from 'react';
import { SceneShell } from '../../components/SceneShell';
import { useLevelFlow } from '../../game/hooks/useLevelFlow';
import { audio } from '../../game/audio/AudioEngine';

const EMOJIS = ['🧒', '👧', '👦', '🤓', '🐕', '🍑', '👘', '☁️'];
const PAIRS = 8;
const TIME_LIMIT = 55;

interface Card { id: number; emoji: string; flipped: boolean; matched: boolean }

function shuffle() {
  const arr: Card[] = [];
  EMOJIS.forEach((e, i) => {
    arr.push({ id: i * 2, emoji: e, flipped: false, matched: false });
    arr.push({ id: i * 2 + 1, emoji: e, flipped: false, matched: false });
  });
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function MemoryScene() {
  const { status, countdown, nextLevelTitle, isLast, win, lose, onWin } = useLevelFlow('memory');
  const [cards, setCards] = useState<Card[]>(() => shuffle());
  const pendingRef = useRef<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [flipCount, setFlipCount] = useState(0);
  const lockRef = useRef(false);
  const wonRef = useRef(false);

  // 固定 id → 图案 映射，比对不依赖渲染时序，杜绝“相同却判不匹配”
  const emojiMap = useMemo(
    () => Object.fromEntries(cards.map((c) => [c.id, c.emoji])),
    // 仅在首次生成后固定：cards 后续只改 flipped/matched，id 与 emoji 不变
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const matchedCount = useMemo(() => cards.filter((c) => c.matched).length / 2, [cards]);

  // 倒计时
  useEffect(() => {
    if (status !== 'playing') return;
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(iv); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [status]);

  // 通关检测
  useEffect(() => {
    if (matchedCount === PAIRS && !wonRef.current) {
      wonRef.current = true;
      win();
    }
  }, [matchedCount, win]);

  // 超时失败
  useEffect(() => {
    if (timeLeft <= 0 && status === 'playing') lose();
  }, [timeLeft, status, lose]);

  const flip = (card: Card) => {
    if (lockRef.current || status !== 'playing') return;
    if (card.flipped || card.matched) return;

    setFlipCount((n) => n + 1);
    const next = [...pendingRef.current, card.id];
    pendingRef.current = next;
    // 现在这张翻面
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, flipped: true } : c)));

    if (next.length < 2) return; // 只翻开第一张

    // 已翻开两张，做配对判断
    const [a, b] = next;
    if (emojiMap[a] === emojiMap[b]) {
      audio.play('match');
      setCards((cs) => cs.map((c) => (next.includes(c.id) ? { ...c, matched: true, flipped: true } : c)));
      pendingRef.current = [];
      return;
    }
    // 不匹配：延迟翻回
    audio.play('mismatch');
    lockRef.current = true;
    setTimeout(() => {
      setCards((cs) => cs.map((c) => (next.includes(c.id) ? { ...c, flipped: false } : c)));
      pendingRef.current = [];
      lockRef.current = false;
    }, 700);
  };

  return (
    <SceneShell title="记忆翻牌" levelId="memory" status={status} countdown={countdown} nextLevelTitle={nextLevelTitle} isLast={isLast} onWin={onWin}
      resultTitle={status === 'win' ? '记忆大师！' : '时间到…'}
      resultSubtitle={status === 'win' ? '春日部的伙伴都找齐啦！' : '再记记，他们的样子你认得吗？'}>
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '70px 14px 20px', gap: 10 }}>
        <div style={{ display: 'flex', gap: 12, fontWeight: 'bold' }}>
          <span style={{ background: 'rgba(255,247,224,0.92)', border: '2px solid #3a1f0d', borderRadius: 12, padding: '4px 12px' }}>
            ⏱ {timeLeft}s
          </span>
          <span style={{ background: 'rgba(255,247,224,0.92)', border: '2px solid #3a1f0d', borderRadius: 12, padding: '4px 12px' }}>
            🃏 {flipCount} 次
          </span>
          <span style={{ background: 'rgba(255,247,224,0.92)', border: '2px solid #3a1f0d', borderRadius: 12, padding: '4px 12px' }}>
            ✨ {matchedCount}/{PAIRS}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, width: '100%', maxWidth: 340, aspectRatio: '4/3' }}>
          {cards.map((c) => (
            <button
              key={c.id}
              onClick={() => flip(c)}
              className="bounce-in"
              style={{
                border: '3px solid #3a1f0d',
                borderRadius: 14,
                fontSize: 30,
                background: c.matched ? '#d8f3dc' : '#ffd166',
                transform: c.flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.4s, background 0.3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 0 rgba(58,31,13,0.2)',
                opacity: c.matched ? 0.8 : 1,
                cursor: c.matched ? 'default' : 'pointer',
              }}
            >
              <span style={{ transform: 'rotateY(180deg)', display: 'inline-block' }}>
                {c.flipped ? c.emoji : '❓'}
              </span>
            </button>
          ))}
        </div>
        <p style={{ fontSize: 13, opacity: 0.7, margin: 0 }}>找到所有成对的伙伴 👇</p>
      </div>
    </SceneShell>
  );
}