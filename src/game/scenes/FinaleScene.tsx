import { useEffect, useRef } from 'react';
import { useGame } from '../../game/state/GameContext';
import { audio } from '../../game/audio/AudioEngine';
import { ImageShinchan } from '../../game/entities/ImageShinchan';
import { ShareButton } from '../../components/ShareButton';

interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string }
interface Rocket { x: number; y: number; vx: number; vy: number; target: number }

const CONFETTI = ['#ef476f', '#06d6a0', '#ffd166', '#118ab2', '#ff9f1c', '#a2d2ff'];

export function FinaleScene() {
  const { dispatch } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    audio.ensure();
    audio.play('victory');
    const t = setTimeout(() => audio.play('victory'), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0, raf = 0;

    const rocks: Rocket[] = [];
    const parts: Particle[] = [];
    const confetti: Particle[] = [];
    let confettiTimer = 0;
    let launchTimer = 0;

    function resize() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 初始彩带
      if (confetti.length === 0) {
        for (let i = 0; i < 60; i++) spawnConfetti();
      }
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function spawnConfetti() {
      confetti.push({
        x: Math.random() * W, y: -20,
        vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 120,
        life: 999, maxLife: 999,
        color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
      });
    }
    function explode(x: number, y: number) {
      const n = 70;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const sp = 50 + Math.random() * 190;
        parts.push({
          x, y,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          life: 0, maxLife: 1 + Math.random(),
          color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
        });
      }
      audio.play('firework');
    }

    let last = performance.now();

    function loop(now: number) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);
      // 夜空背景
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0f0c29'); g.addColorStop(0.5, '#302b63'); g.addColorStop(1, '#24243e');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // 星星
      for (let i = 0; i < 40; i++) {
        const tw = Math.sin(now / 600 + i) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255,255,255,${0.2 + tw * 0.6})`;
        ctx.beginPath(); ctx.arc(((i * 93) % W) % W, ((i * 47) % (H * 0.6)), 1.5, 0, Math.PI * 2); ctx.fill();
      }

      // 发射烟火
      launchTimer -= dt;
      if (launchTimer <= 0) {
        rocks.push({ x: W * (0.2 + Math.random() * 0.6), y: H, vx: (Math.random() - 0.5) * 40, vy: -(280 + Math.random() * 180), target: H * (0.15 + Math.random() * 0.3) });
        launchTimer = 0.6 + Math.random() * 0.7;
      }
      for (let i = rocks.length - 1; i >= 0; i--) {
        const r = rocks[i];
        r.x += r.vx * dt; r.y += r.vy * dt;
        ctx.fillStyle = '#ffd166';
        ctx.beginPath(); ctx.arc(r.x, r.y, 3, 0, Math.PI * 2); ctx.fill();
        if (r.y <= r.target) { explode(r.x, r.y); rocks.splice(i, 1); }
      }

      // 粒子
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.maxLife) { parts.splice(i, 1); continue; }
        p.vy += 120 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const a = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 彩带
      confettiTimer -= dt;
      if (confettiTimer <= 0) { spawnConfetti(); confettiTimer = 1.2; }
      for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        c.vy += 30 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(now / 400 + i);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(-4, -7, 8, 14);
        ctx.restore();
        if (c.y > H + 20) { c.y = -20; c.x = Math.random() * W; }
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const home = () => { audio.play('click'); dispatch({ type: 'GO', stage: 'level-select' }); };
  const replay = () => { audio.play('click'); dispatch({ type: 'GO', stage: 'start' }); };

  return (
    <div className="game-root" id="share-root" style={{ position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* 聚光灯效果 */}
      <div style={{
        position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)',
        width: '72vmin', height: '72vmin', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.12) 35%, transparent 65%)',
      }} />

      {/* 祝福文字 */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 16, zIndex: 4 }}>
        <div className="bounce-in" style={{ background: 'rgba(255,247,224,0.92)', border: '4px solid #3a1f0d', borderRadius: 28, padding: '18px 26px', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', maxWidth: 360 }}>
          <div style={{ fontSize: 20, fontWeight: 'bold', color: '#3a1f0d', marginBottom: 6 }}>嗨起来！星星大作战 · 生日快乐</div>
          <div
            className="crayon-text"
            style={{
              fontSize: 'clamp(30px, 9vw, 46px)',
              fontWeight: 'bold',
              color: '#ef476f',
              letterSpacing: 3,
              textShadow: '2px 2px 0 #ffd166',
              margin: '4px 0 2px',
            }}
          >
            祝你生日快乐
          </div>
          <div style={{ fontSize: 17, marginTop: 4, color: '#3a1f0d', opacity: 0.85 }}>
            星星已集齐，愿望正在实现 ✨
          </div>
        </div>

        {/* 跳舞小新 */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <ImageShinchan size={150} />
        </div>

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
          <ShareButton label="分享祝福" />
          <button className="btn-crayon primary" onClick={replay}>🔄 再来一次</button>
          <button className="btn-crayon" onClick={home}>📋 关卡</button>
        </div>
      </div>
    </div>
  );
}