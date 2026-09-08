import { useEffect, useRef, useState } from 'react';
import { SceneShell } from '../../components/SceneShell';
import { useLevelFlow } from '../../game/hooks/useLevelFlow';
import { audio } from '../../game/audio/AudioEngine';

interface Platform { x: number; y: number; w: number; h: number; vx?: number; x0: number; min: number; max: number }

interface GameState1 {
  player: { x: number; y: number; vx: number; vy: number; onGround: boolean };
  platforms: Platform[];
  star: { x: number; y: number };
  lives: number;
  startTime: number;
  timeLimit: number;
  won: boolean;
}

const GROUND_Y = 560;

export function JumpScene() {
  const { status, win, lose, onWin } = useLevelFlow('jump');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // 跨 effect/回调共享的可变引用
  const keysRef = useRef({ left: false, right: false, jump: false, jumpHeld: false });
  const gameRef = useRef<GameState1 | null>(null);
  const statusRef = useRef<'playing' | 'win' | 'lose'>('playing');
  const timeLeftRef = useRef(45);
  const [timeLeft, setTimeLeft] = useState(45);

  useEffect(() => {
    statusRef.current = status;
    const g = gameRef.current;
    if (status === 'win' && g) g.won = true;
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const wrap = wrapRef.current as HTMLDivElement;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    let W = 0, H = 0, raf = 0;

    function buildLevel(w: number) {
      // 本地坐标（宽度约 445），之后统一缩放并水平居中，宽屏不靠左
      const spec: { x: number; y: number; w: number; vx?: number; min?: number; max?: number }[] = [
        { x: 250, y: 495, w: 110, vx: 70,  min: 250, max: 360 },
        { x: 40,  y: 430, w: 85 },
        { x: 280, y: 465, w: 95,  vx: 120, min: 280, max: 400 },
        { x: 110, y: 350, w: 80 },
        { x: 330, y: 400, w: 90 },
        { x: 90,  y: 270, w: 85,  vx: 150, min: 90,  max: 300 },
        { x: 350, y: 180, w: 95 },
        { x: 140, y: 95,  w: 110, vx: 160, min: 140, max: 320 },
      ];
      const courseW = Math.max(...spec.map((s) => s.x + s.w)); // ~445
      const scale = Math.min(1, (w - 60) / courseW);           // 窄屏等比缩小以容纳
      const offset = Math.max(0, (w - courseW * scale) / 2);   // 水平居中
      const sx = (v: number) => v * scale + offset;

      const platforms: Platform[] = [
        { x: 20, y: GROUND_Y, w: w - 40, h: 40, x0: 20, min: 20, max: 20 },
        ...spec.map((s) => ({
          x: sx(s.x), y: s.y, w: s.w * scale, h: 14, x0: sx(s.x),
          vx: s.vx, min: sx(s.min ?? s.x), max: sx(s.max ?? s.x + s.w),
        })),
      ];
      const landing = sx(140) + 10;
      gameRef.current = {
        player: { x: landing, y: GROUND_Y, vx: 0, vy: 0, onGround: true },
        platforms,
        star: { x: landing, y: 66 },
        lives: 3,
        startTime: performance.now(),
        timeLimit: 45,
        won: false,
      };
      timeLeftRef.current = 45;
    }

    function resize() {
      const rect = wrap.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!gameRef.current) buildLevel(W);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = true;
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') keysRef.current.jump = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = false;
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') keysRef.current.jump = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const GRAVITY = 1500, MOVE = 330, JUMP_V = -690;
    let last = performance.now();

    function update(dt: number) {
      const g = gameRef.current;
      if (!g || g.won) return;
      const p = g.player;

      if (keysRef.current.left) p.vx = -MOVE;
      else if (keysRef.current.right) p.vx = MOVE;
      else p.vx *= 0.8;

      if (keysRef.current.jump && p.onGround) {
        p.vy = JUMP_V;
        p.onGround = false;
        keysRef.current.jump = false;
        audio.play('jump');
      }

      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < 0) p.x = 0;
      if (p.x > W - 26) p.x = W - 26;

      p.onGround = false;
      for (const pl of g.platforms) {
        if (pl.vx) {
          pl.x += pl.vx * dt;
          if (pl.x <= pl.min) { pl.x = pl.min; pl.vx = Math.abs(pl.vx); }
          if (pl.x + pl.w >= pl.max) { pl.x = pl.max - pl.w; pl.vx = -Math.abs(pl.vx); }
        }
        if (
          p.vy >= 0 &&
          p.x + 24 > pl.x && p.x + 2 < pl.x + pl.w &&
          p.y + 12 >= pl.y && p.y + 12 <= pl.y + pl.h + 20
        ) {
          p.y = pl.y - 12;
          p.vy = 0;
          p.onGround = true;
        }
      }

      // 星星
      if (!g.won &&
        Math.abs(p.x + 13 - g.star.x) < 30 &&
        Math.abs(p.y - 14 - g.star.y) < 34) {
        g.won = true;
        audio.play('hit');
        win();
        return;
      }

      // 掉落
      if (p.y > H + 60) {
        g.lives -= 1;
        if (g.lives <= 0) {
          lose();
          return;
        }
        p.x = W * 0.2; p.y = GROUND_Y; p.vx = 0; p.vy = 0;
        audio.play('bad');
      }

      // 倒计时
      const remain = Math.max(0, Math.ceil(g.timeLimit - (performance.now() - g.startTime) / 1000));
      if (remain !== timeLeftRef.current) {
        timeLeftRef.current = remain;
        setTimeLeft(remain);
      }
      if (remain <= 0 && !g.won) lose();
    }

    function draw() {
      const g = gameRef.current;
      if (!g) return;
      ctx.clearRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#aee6ff');
      sky.addColorStop(1, '#fff7e0');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(W * (0.15 + i * 0.25), 46 + (i % 2) * 12, 24 + (i % 2) * 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // 地面
      ctx.fillStyle = '#7bbf5a';
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.fillStyle = '#5c9e46';
      ctx.fillRect(0, GROUND_Y, W, 6);

      // 平台
      for (const pl of g.platforms) {
        if (pl.y >= GROUND_Y) continue;
        ctx.fillStyle = '#8c5a2b';
        rounded(pl.x, pl.y, pl.w, pl.h, 4);
        ctx.fillStyle = '#5f3a14';
        ctx.fillRect(pl.x, pl.y, pl.w, 4);
      }

      // 小新
      drawShinchan(g.player);
      drawLivesLabels(g.lives);

      // 星星
      const sy = Math.sin(performance.now() / 400) * 7;
      drawStar(g.star.x, g.star.y + sy, 24);
    }

    function drawShinchan(p: GameState1['player']) {
      const x = p.x, y = p.y;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(x + 13, GROUND_Y + 4, 16, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // body red
      ctx.fillStyle = '#e63946';
      rounded(x, y - 20, 26, 22, 7);
      ctx.fillStyle = '#c72c3b';
      rounded(x + 3, y - 20, 20, 6, 3);
      // head
      ctx.fillStyle = '#f7cfa0';
      ctx.beginPath();
      ctx.arc(x + 13, y - 30, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a1f0d';
      ctx.lineWidth = 2;
      ctx.stroke();
      // hair
      ctx.fillStyle = '#3a1f0d';
      ctx.beginPath();
      ctx.arc(x + 13, y - 42, 7, Math.PI, 0);
      ctx.fill();
      // brows
      ctx.strokeStyle = '#3a1f0d';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + 2, y - 33); ctx.lineTo(x + 12, y - 31); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 24, y - 33); ctx.lineTo(x + 14, y - 31); ctx.stroke();
      // eyes
      ctx.fillStyle = '#3a1f0d';
      ctx.beginPath(); ctx.arc(x + 9, y - 28, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 19, y - 28, 2.2, 0, Math.PI * 2); ctx.fill();
      // mouth
      ctx.strokeStyle = '#b3542a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + 13, y - 22, 5, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.restore();
    }

    function drawStar(x: number, y: number, r: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const px = r * Math.cos(a), py = r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        const a2 = a + Math.PI / 5;
        ctx.lineTo(r * 0.4 * Math.cos(a2), r * 0.4 * Math.sin(a2));
      }
      ctx.closePath();
      ctx.fillStyle = '#ffd166';
      ctx.strokeStyle = '#3a1f0d';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    function drawLivesLabels(lives: number) {
      for (let i = 0; i < lives; i++) {
        ctx.fillStyle = '#ef476f';
        rounded(90 + i * 26, 12, 18, 18, 5);
      }
    }

    function rounded(x: number, y: number, w: number, h: number, r: number) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fill();
    }

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
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTouch = (k: 'left' | 'right' | 'jump', v: boolean) => {
    keysRef.current[k] = v;
  };

  return (
    <SceneShell title="跳跳大冒险" levelId="jump" status={status} onWin={onWin}
      resultTitle={status === 'win' ? '拿到星星！' : '差一点…'}
      resultSubtitle={status === 'win' ? '踩着屋顶，总能到想去的地方！' : '小新摔倒了…再试一次rrrr～'}>
      <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {status === 'playing' && (
        <div style={{ position: 'absolute', top: 62, right: 10, zIndex: 15, background: 'rgba(255,247,224,0.92)', border: '2px solid #3a1f0d', borderRadius: 14, padding: '3px 12px', fontWeight: 'bold', fontSize: 16 }}>
          ⏱ {timeLeft}s
        </div>
      )}

      {status === 'playing' && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 12, zIndex: 15, display: 'flex', justifyContent: 'space-between', padding: '0 14px' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <TouchBtn onPress={(v) => setTouch('left', v)}>◀</TouchBtn>
            <TouchBtn onPress={(v) => setTouch('right', v)}>▶</TouchBtn>
          </div>
          <TouchBtn primary onPress={(v) => setTouch('jump', v)}>⤴</TouchBtn>
        </div>
      )}
    </SceneShell>
  );
}

function TouchBtn({ children, primary, onPress }: { children: string; primary?: boolean; onPress: (v: boolean) => void }) {
  return (
    <button
      className={primary ? 'btn-crayon primary' : 'btn-crayon'}
      style={{ width: 62, height: 62, fontSize: 22, borderRadius: '50%', padding: 0 }}
      onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture(e.pointerId); onPress(true); }}
      onPointerUp={() => onPress(false)}
      onPointerCancel={() => onPress(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}