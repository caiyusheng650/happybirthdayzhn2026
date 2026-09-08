import { useEffect, useRef, useState } from 'react';
import { SceneShell } from '../../components/SceneShell';
import { useLevelFlow } from '../../game/hooks/useLevelFlow';
import { audio } from '../../game/audio/AudioEngine';

interface StarBall { x: number; y: number; outer: number; inner: number; vx: number; vy: number; rot: number; spin: number; color: string; wob: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }

// 难度参数
const GOAL = 72;        // 60 秒内点中 72 次
const TIME_LIMIT = 60;  // 秒
const COUNT = 7;        // 屏幕同时出现的小球数量

const PALETTE = ['#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#bdb2ff', '#ffadad', '#ffc6ff', '#a7f3d0'];

/** 第 5 关 · 追踪星星：60 秒内精准点中 72 次会漂动的小星星即可过关 */
export function AimScene() {
  const { status, win, lose, onWin } = useLevelFlow('aim');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const gameRef = useRef<{
    balls: StarBall[]; particles: Particle[]; hits: number; startTime: number; won: boolean;
  } | null>(null);
  const statusRef = useRef<'playing' | 'win' | 'lose'>('playing');
  const [hud, setHud] = useState({ hits: 0, time: TIME_LIMIT });

  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const wrap = wrapRef.current as HTMLDivElement;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    let W = 0, H = 0, raf = 0;

    function makeBall(avoid: { x: number; y: number; outer: number }[] = []): StarBall {
      const outer = 24 + Math.random() * 10;
      let px = outer + 16, py = outer + 40;
      for (let tries = 0; tries < 40; tries++) {
        const tx = outer + 16 + Math.random() * (W - (outer + 16) * 2);
        const ty = outer + 40 + Math.random() * (H - (outer + 40) * 2 - 80);
        const ok = avoid.every((b) => (tx - b.x) ** 2 + (ty - b.y) ** 2 > (outer + b.outer + 30) ** 2);
        px = tx; py = ty;
        if (ok) break;
      }
      const dir = Math.random() < 0.5 ? 1 : -1;
      return {
        x: px, y: py, outer, inner: outer * 0.42,
        vx: dir * (24 + Math.random() * 42),
        vy: dir * (24 + Math.random() * 42),
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.7,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        wob: Math.random() * Math.PI * 2,
      };
    }

    function resize() {
      const r = wrap.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!gameRef.current) {
        const balls: StarBall[] = [];
        for (let i = 0; i < COUNT; i++) balls.push(makeBall(balls));
        gameRef.current = { balls, particles: [], hits: 0, startTime: performance.now(), won: false };
      }
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    function respawn(b: StarBall) {
      const g = gameRef.current!;
      const nb = makeBall(g.balls);
      b.x = nb.x; b.y = nb.y; b.vx = nb.vx; b.vy = nb.vy; b.rot = nb.rot; b.color = nb.color;
    }

    function burst(x: number, y: number, color: string) {
      const g = gameRef.current!;
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 40 + Math.random() * 120;
        g.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.4, color });
      }
    }

    let last = performance.now();

    function update(dt: number) {
      const g = gameRef.current;
      if (!g || g.won) return;
      const elapsed = (performance.now() - g.startTime) / 1000;
      const remain = Math.max(0, Math.ceil(TIME_LIMIT - elapsed));
      if (remain !== hud.time) setHud((h) => ({ hits: g!.hits, time: remain }));
      if (remain <= 0) { lose(); return; }

      // 小球缓慢移动 + 边缘反弹
      const m = 12;
      for (const b of g.balls) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rot += b.spin * dt;
        if (b.x < b.outer + m) { b.x = b.outer + m; b.vx = Math.abs(b.vx); }
        if (b.x > W - b.outer - m) { b.x = W - b.outer - m; b.vx = -Math.abs(b.vx); }
        if (b.y < b.outer + 30) { b.y = b.outer + 30; b.vy = Math.abs(b.vy); }
        if (b.y > H - b.outer - m) { b.y = H - b.outer - m; b.vy = -Math.abs(b.vy); }
      }

      // 粒子
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.96; p.vy *= 0.96; p.life -= dt;
        if (p.life <= 0) g.particles.splice(i, 1);
      }
    }

    function draw() {
      const g = gameRef.current;
      if (!g) return;
      ctx.clearRect(0, 0, W, H);
      // 夜色天空
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#2b1a4a'); sky.addColorStop(1, '#443a7a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // 背景星空
      for (let i = 0; i < 40; i++) {
        const sx = (i * 59 + 13) % W, sy = (i * 31 + 7) % (H - 40);
        ctx.fillStyle = `rgba(255,255,255,${0.2 + (i % 4) * 0.15})`;
        ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, Math.PI * 2); ctx.fill();
      }

      // 小球（星星）
      for (const b of g.balls) {
        const pulse = 1 + Math.sin(performance.now() / 300 + b.wob) * 0.05;
        drawStar(b.x, b.y, b.outer * pulse, b.inner, b.rot, b.color);
      }

      // 粒子
      for (const p of g.particles) {
        ctx.globalAlpha = Math.max(0, p.life / 0.8);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawStar(x: number, y: number, outer: number, inner: number, rot: number, color: string) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      // 蜡笔感阴影
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(58,31,13,0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const a2 = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.lineTo(Math.cos(a2) * inner, Math.sin(a2) * inner);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(-outer * 0.28, -outer * 0.28, outer * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // 点击/触碰命中
    const onPointer = (e: PointerEvent) => {
      const g = gameRef.current;
      if (!g || g.won || statusRef.current !== 'playing') return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      // 从最上层往内判定
      for (let i = g.balls.length - 1; i >= 0; i--) {
        const b = g.balls[i];
        const dx = x - b.x, dy = y - b.y;
        if (dx * dx + dy * dy <= (b.outer + 8) * (b.outer + 8)) {
          burst(b.x, b.y, b.color);
          g.hits += 1;
          setHud((h) => ({ hits: g!.hits, time: h.time }));
          audio.play('hit');
          respawn(b);
          if (g.hits >= GOAL) { g.won = true; win(); }
          break;
        }
      }
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
    <SceneShell title="追踪星星" levelId="aim" status={status} onWin={onWin}
      resultTitle={status === 'win' ? '神射手！' : '时间到…'}
      resultSubtitle={status === 'win' ? '72 颗星星全部点亮，太厉害啦！' : '还差一点点，再稳准狠一次！'}>
      <div ref={wrapRef} style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>
      {status === 'playing' && (
        <div style={{ position: 'absolute', top: 62, right: 10, textAlign: 'right', zIndex: 15, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ background: 'rgba(255,247,224,0.92)', border: '2px solid #3a1f0d', borderRadius: 12, padding: '2px 10px', fontSize: 16, fontWeight: 'bold' }}>
            ⭐ {hud.hits}/{GOAL}
          </span>
          <span style={{ background: 'rgba(255,247,224,0.92)', border: '2px solid #3a1f0d', borderRadius: 12, padding: '2px 10px', fontSize: 16, fontWeight: 'bold' }}>
            ⏱ {hud.time}s
          </span>
        </div>
      )}
    </SceneShell>
  );
}