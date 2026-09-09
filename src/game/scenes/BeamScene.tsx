import { useEffect, useRef, useState } from 'react';
import { SceneShell } from '../../components/SceneShell';
import { useLevelFlow } from '../../game/hooks/useLevelFlow';
import { audio } from '../../game/audio/AudioEngine';

interface Fruit { x: number; y: number; r: number; vy: number; type: string; wob: number }
interface Beam { x: number; y: number; ty: number; speed: number }

// 难度参数
const GOAL = 15;
const TIME_LIMIT = 30;

export function BeamScene() {
  const { status, countdown, nextLevelTitle, isLast, win, lose, onWin } = useLevelFlow('beam');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const gameRef = useRef<{
    fruits: Fruit[]; beams: Beam[]; hits: number; lives: number;
    startTime: number; spawnTimer: number; won: boolean;
  } | null>(null);
  const statusRef = useRef<'playing' | 'win' | 'lose'>('playing');
  const [hud, setHud] = useState({ hits: 0, lives: 3, time: TIME_LIMIT });

  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const wrap = wrapRef.current as HTMLDivElement;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    let W = 0, H = 0, raf = 0;

    function resize() {
      const r = wrap.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!gameRef.current) {
        gameRef.current = { fruits: [], beams: [], hits: 0, lives: 3, startTime: performance.now(), spawnTimer: 0, won: false };
      }
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let last = performance.now();

    function spawn() {
      const g = gameRef.current!;
      const fr: Fruit[] = [];
      const n = 1 + (performance.now() - g.startTime) / 1000 > 15 ? (Math.random() < 0.5 ? 1 : 2) : 1;
      for (let i = 0; i < n; i++) {
        const r = 22 + Math.random() * 10;
        fr.push({
          x: r + Math.random() * (W - r * 2),
          y: -30,
          r,
          vy: 170 + Math.random() * 120 + (performance.now() - g.startTime) / 60000 * 60,
          type: ['#f4a261', '#ef476f', '#118ab2', '#a7c957', '#e76f51'][Math.floor(Math.random() * 5)],
          wob: Math.random(),
        });
      }
      g.fruits.push(...fr);
    }

    function update(dt: number) {
      const g = gameRef.current;
      if (!g || g.won) return;
      const elapsed = (performance.now() - g.startTime) / 1000;
      const remain = Math.max(0, Math.ceil(TIME_LIMIT - elapsed));
      if (remain !== hud.time) {
        const h = { hits: g.hits, lives: g.lives, time: remain };
        setHud(h);
      }
      if (remain <= 0) { lose(); return; }

      // 生成
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) { spawn(); g.spawnTimer = 0.75 - elapsed / 100; }

      // 光束
      for (const b of g.beams) {
        b.y -= b.speed * dt;
        // 命中检测
        for (let i = g.fruits.length - 1; i >= 0; i--) {
          const f = g.fruits[i];
          const dx = f.x - b.x, dy = f.y - b.y;
          if (dx * dx + dy * dy < (f.r + 6) * (f.r + 6)) {
            g.fruits.splice(i, 1);
            g.hits += 1;
            audio.play('hit');
            if (g.hits >= GOAL) { g.won = true; win(); }
            break;
          }
        }
      }
      g.beams = g.beams.filter((b) => b.y > -20);

      // 水果下落
      for (let i = g.fruits.length - 1; i >= 0; i--) {
        const f = g.fruits[i];
        f.y += f.vy * dt;
        if (f.y > H + 30) {
          g.fruits.splice(i, 1);
          g.lives -= 1;
          audio.play('bad');
          setHud((h) => ({ ...h, lives: g!.lives }));
          if (g.lives <= 0) { lose(); return; }
        }
      }
    }

    function draw() {
      const g = gameRef.current;
      if (!g) return;
      ctx.clearRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#261e4a'); sky.addColorStop(1, '#3d4a7a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // 星空
      for (let i = 0; i < 30; i++) {
        const sx = (i * 71) % W, sy = (i * 37) % (H / 1.5);
        ctx.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) * 0.1})`;
        ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
      }

      // 光束
      for (const b of g.beams) {
        const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + 60);
        grad.addColorStop(0, '#ffe66d'); grad.addColorStop(1, 'rgba(255,230,109,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y + 60); ctx.stroke();
      }

      // 水果
      // 该水果需要逐步下降
      for (const f of g.fruits) {
        const wob = Math.sin(performance.now() / 200 + f.wob) * 3;
        ctx.fillStyle = f.type;
        ctx.beginPath(); ctx.arc(f.x + wob, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(58,31,13,0.7)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(f.x - 5 + wob, f.y - 6, f.r * 0.3, 0, Math.PI * 2); ctx.fill();
      }

      // 发射台
      drawLaunchPad(W / 2, H - 40);
    }

    function drawLaunchPad(x: number, y: number) {
      ctx.save();
      ctx.translate(x, y);
      // 阴影
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(0, 8, 36, 7, 0, 0, Math.PI * 2); ctx.fill();
      // 底座（圆形）
      ctx.fillStyle = '#6b5236';
      ctx.beginPath(); ctx.ellipse(0, 0, 32, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a1f0d'; ctx.lineWidth = 2; ctx.stroke();
      // 发射筒
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.moveTo(-14, -2); ctx.lineTo(-10, -30); ctx.lineTo(10, -30); ctx.lineTo(14, -2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 发射口亮光
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath(); ctx.arc(0, -30, 6, 0, Math.PI * 2); ctx.fill();
      // 小装饰：两侧灯
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(-22, -4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(22, -4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // 点击发射
    const onPointer = (e: PointerEvent) => {
      const g = gameRef.current;
      if (!g || g.won || statusRef.current !== 'playing') return;
      const rect = canvas.getBoundingClientRect();
      const tx = e.clientX - rect.left, ty = e.clientY - rect.top;
      g.beams.push({ x: tx, y: H - 60, ty, speed: 900 });
      // 若命中水果也立即判定（靠 next 帧 beam 飞行）
      audio.play('beam');
    };
    canvas.addEventListener('pointerdown', onPointer);

    function loop(now: number) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (statusRef.current === 'playing') update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SceneShell title="动感光波" levelId="beam" status={status} countdown={countdown} nextLevelTitle={nextLevelTitle} isLast={isLast} onWin={onWin}
      resultTitle={status === 'win' ? '全命中！' : '差一点啦…'}
      resultSubtitle={status === 'win' ? '动感光波，biu biu biu！' : '再瞄准一点，你可以的！'}>
      <div ref={wrapRef} style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>
      {status === 'playing' && (
        <div style={{ position: 'absolute', top: 'calc(var(--hud-h) + 6px)', right: 10, textAlign: 'right', zIndex: 15, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ background: 'rgba(255,247,224,0.92)', border: '2px solid #3a1f0d', borderRadius: 12, padding: '2px 10px', fontSize: 16, fontWeight: 'bold' }}>
            ☄ {hud.hits}/{GOAL}
          </span>
          <span style={{ background: 'rgba(255,247,224,0.92)', border: '2px solid #3a1f0d', borderRadius: 12, padding: '2px 10px', fontSize: 16, fontWeight: 'bold' }}>
            ⏱ {hud.time}s
          </span>
          <span style={{ background: 'rgba(255,247,224,0.92)', border: '2px solid #3a1f0d', borderRadius: 12, padding: '2px 10px', fontSize: 16, fontWeight: 'bold' }}>
            {'❤️'.repeat(hud.lives)}
          </span>
        </div>
      )}
    </SceneShell>
  );
}