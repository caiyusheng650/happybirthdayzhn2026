import { useEffect, useRef, useState } from 'react';
import { SceneShell } from '../../components/SceneShell';
import { useLevelFlow } from '../../game/hooks/useLevelFlow';
import { audio } from '../../game/audio/AudioEngine';

const BPM = 142;
const BEAT = 60 / BPM;
const LANES = 4;
const TOTAL_BEATS = 76;

interface Note { time: number; lane: number }
interface Judge { type: 'perfect' | 'good' | 'miss'; time: number; x: number }
interface Game4 {
  start: number; hitIdx: number; lives: number; combo: number;
  judged: number; won: boolean;
}

function buildChart(): Note[] {
  const notes: Note[] = [];
  for (let b = 0; b < TOTAL_BEATS; b++) {
    const t = b * BEAT;
    const lane = b % LANES;
    notes.push({ time: t, lane });
    if (b % 8 === 3) notes.push({ time: t + 0.12, lane: (lane + 2) % LANES });
    if (b % 16 === 11) notes.push({ time: t, lane: (lane + 1) % LANES });
  }
  return notes;
}

const MAX_MISS = 3;
const LEAD_IN = 2.4; // 进入游戏后的准备倒计时（秒），期间无需按键

export function RhythmScene() {
  const { status, win, lose, onWin } = useLevelFlow('rhythm');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const chartRef = useRef(buildChart());
  const gameRef = useRef<Game4>({ start: 0, hitIdx: 0, lives: MAX_MISS, combo: 0, judged: 0, won: false });
  const statusRef = useRef<'playing' | 'win' | 'lose'>('playing');
  const judgeRef = useRef<Judge[]>([]);
  const flashRef = useRef<{ lane: number; time: number }[]>([]);
  const hitRef = useRef<((lane: number) => void) | null>(null);

  const [hud, setHud] = useState({ progress: 0, lives: MAX_MISS, combo: 0 });

  useEffect(() => {
    statusRef.current = status;
    if (status === 'win') gameRef.current.won = true;
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const wrap = wrapRef.current as HTMLDivElement;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    let W = 0, H = 0, raf = 0;
    const HIT_Y = 0.82;
    const NOTE_TRAVEL = 1.0;
    let laneW = W / LANES;

    function resize() {
      const r = wrap.getBoundingClientRect();
      W = r.width; H = r.height;
      laneW = W / LANES;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    function updateHud(g: Game4) {
      const progress = Math.min(1, g.hitIdx / chartRef.current.length);
      setHud({ progress, lives: Math.max(0, g.lives), combo: g.combo });
    }

    function doWin(g: Game4) {
      if (g.won) return;
      g.won = true;
      win();
    }
    function doLose(g: Game4) {
      if (g.won) return;
      g.won = true;
      lose();
    }

    function hitLane(lane: number) {
      const g = gameRef.current;
      if (statusRef.current !== 'playing' || g.won) return;
      const nowBeat = (performance.now() - g.start) / 1000;
      if (nowBeat < 0) return; // 准备倒计时内不判定，也不计失误
      let bestIdx = -1, bestD = Infinity;
      for (let i = g.hitIdx; i < chartRef.current.length; i++) {
        const n = chartRef.current[i];
        if (nowBeat - n.time > 0.6) continue;
        if (n.lane !== lane) { if (n.time + 0.15 > nowBeat) break; else continue; }
        const d = Math.abs(nowBeat - n.time);
        if (d < bestD) { bestD = d; bestIdx = i; }
      }
      if (bestIdx === -1) {
        audio.play('bad');
        g.lives -= 1;
        g.combo = 0;
        judgeRef.current.push({ type: 'miss', time: nowBeat, x: lane * laneW + laneW / 2 });
        updateHud(g);
        if (g.lives <= 0) doLose(g);
        return;
      }
      const perfect = bestD < 0.11, good = bestD < 0.22;
      g.hitIdx = bestIdx + 1;
      audio.play(perfect ? 'good' : 'hit');
      g.combo += 1;
      flashRef.current.push({ lane, time: nowBeat });
      // 双押判定时若中间漏了不同声部，此处简化不做扣分
      judgeRef.current.push({
        type: perfect ? 'perfect' : good ? 'good' : 'good',
        time: nowBeat,
        x: lane * laneW + laneW / 2,
      });
      updateHud(g);
      if (g.hitIdx >= chartRef.current.length) doWin(g);
    }

    function update(g: Game4) {
      if (g.won) return;
      const nowBeat = (performance.now() - g.start) / 1000;
      for (let i = g.hitIdx; i < chartRef.current.length; i++) {
        const n = chartRef.current[i];
        if (nowBeat - n.time > 0.3) {
          g.hitIdx = i + 1;
          g.combo = 0;
          g.lives -= 1;
          judgeRef.current.push({ type: 'miss', time: nowBeat, x: n.lane * laneW + laneW / 2 });
          audio.play('bad');
          updateHud(g);
          if (g.lives <= 0) { doLose(g); return; }
        } else {
          break;
        }
      }
    }

    function draw() {
      const g = gameRef.current;
      if (!g) return;
      ctx.clearRect(0, 0, W, H);
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#2c1a4d'); grad.addColorStop(1, '#4a2060');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      const hitY = H * HIT_Y;
      const nowBeat = (performance.now() - g.start) / 1000;

      for (let i = 0; i < LANES; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.09)';
        ctx.fillRect(i * laneW, 0, laneW, H);
      }

      // 命中闪光：点亮对应轨道的亮光
      flashRef.current = flashRef.current.filter((f) => nowBeat - f.time < 0.18);
      for (const f of flashRef.current) {
        const k = (nowBeat - f.time) / 0.18;
        ctx.fillStyle = `rgba(255,230,109,${(1 - k) * 0.55})`;
        ctx.fillRect(f.lane * laneW, 0, laneW, H);
        ctx.fillStyle = `rgba(255,255,255,${(1 - k) * 0.5})`;
        ctx.fillRect(f.lane * laneW, hitY - 3, laneW, 6);
      }

      for (const n of chartRef.current) {
        if (n.time < nowBeat - 0.25) continue;
        if (n.time > nowBeat + NOTE_TRAVEL) break;
        const y = hitY - ((n.time - nowBeat) / NOTE_TRAVEL) * H;
        ctx.save();
        ctx.shadowColor = '#ffe66d'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffe66d';
        rRect(n.lane * laneW + laneW * 0.12, y - 22, laneW * 0.76, 44, 9);
        ctx.restore();
      }

      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(0, hitY); ctx.lineTo(W, hitY); ctx.stroke();

      const now = performance.now() / 1000;
      ctx.textAlign = 'center';

      // 准备倒计时
      const lead = -nowBeat;
      if (lead > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffe66d';
        ctx.font = 'bold 30px Patrick Hand, sans-serif';
        ctx.fillText('准备…', W / 2, H / 2 - 44);
        ctx.font = 'bold 56px Patrick Hand, sans-serif';
        ctx.fillText(String(Math.max(1, Math.ceil(lead))), W / 2, H / 2 + 20);
      } else if (nowBeat >= 0 && nowBeat < 0.35) {
        ctx.fillStyle = '#06d6a0';
        ctx.font = 'bold 34px Patrick Hand, sans-serif';
        ctx.fillText('GO!', W / 2, H / 2);
      } else {
        for (const j of judgeRef.current) {
          if (now - j.time > 0.6) continue;
          const rise = (now - j.time) * 40;
          ctx.fillStyle = j.type === 'perfect' ? '#ffd166' : j.type === 'good' ? '#06d6a0' : '#ef476f';
          ctx.font = 'bold 24px Patrick Hand, sans-serif';
          ctx.fillText(j.type === 'perfect' ? 'PERFECT' : 'GOOD', j.x, hitY - 60 - rise);
        }
      }
      ctx.textAlign = 'left';
    }

    function rRect(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath(); ctx.fill();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const map: Record<string, number> = {
        KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3,
        ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3,
      };
      const lane = map[e.code];
      if (lane !== undefined) { e.preventDefault(); hitLane(lane); }
    };
    window.addEventListener('keydown', onKeyDown);

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const lane = Math.floor(((e.clientX - rect.left) / rect.width) * LANES);
      hitLane(lane);
    };
    canvas.addEventListener('pointerdown', onPointer);

    // 暴露 hitLane 给底部按钮
    hitRef.current = hitLane;

    gameRef.current.start = performance.now() + LEAD_IN * 1000;

    function loop(now: number) {
      if (statusRef.current === 'playing' && !gameRef.current.won) update(gameRef.current);
      draw();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = Math.round(hud.progress * 100);

  return (
    <SceneShell title="节奏打call" levelId="rhythm" status={status} onWin={onWin}
      resultTitle={status === 'win' ? '动感节奏！' : '节拍跟丢了…'}
      resultSubtitle={status === 'win' ? '小新跳得比谁都欢！' : '跟着节拍，别停～'}>
      <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {status === 'playing' && (
        <>
          <div style={{ position: 'absolute', top: 62, left: 12, width: '38%', zIndex: 15 }}>
            <div style={{ height: 12, background: 'rgba(255,255,255,0.3)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: progress + '%', background: '#ffd166', transition: 'width 0.15s', borderRadius: 6 }} />
            </div>
          </div>
          <div style={{ position: 'absolute', top: 66, right: 12, zIndex: 15, display: 'flex', gap: 6 }}>
            <span style={{ background: 'rgba(255,247,224,0.92)', border: '2px solid #3a1f0d', borderRadius: 10, padding: '2px 8px', fontWeight: 'bold' }}>
              {'❤️'.repeat(Math.max(0, hud.lives))}
            </span>
            <span style={{ background: 'rgba(255,247,224,0.92)', border: '2px solid #3a1f0d', borderRadius: 10, padding: '2px 8px', fontWeight: 'bold' }}>
              COMBO {hud.combo}
            </span>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 15, display: 'flex' }}>
            {[0, 1, 2, 3].map((lane) => (
              <button
                key={lane}
                onPointerDown={(e) => { e.preventDefault(); hitRef.current?.(lane); }}
                style={{
                  flex: 1, height: 72, border: '3px solid #3a1f0d',
                  background: ['#ef476f', '#06d6a0', '#ffd166', '#118ab2'][lane],
                  fontSize: 24, opacity: 0.88,
                }}
              >
                {['D', 'F', 'J', 'K'][lane]}
              </button>
            ))}
          </div>
        </>
      )}
    </SceneShell>
  );
}