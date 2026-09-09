import { useEffect, useRef, useState } from 'react';
import { SceneShell } from '../../components/SceneShell';
import { useLevelFlow } from '../../game/hooks/useLevelFlow';
import { audio } from '../../game/audio/AudioEngine';

/** 已经叠好的蛋糕层（在塔顶静止） */
interface StackedLayer {
  x: number;       // 蛋糕中心 x（屏幕坐标）
  width: number;
  color: string;
  topSprinkle: string; // 顶层奶油颜色
}

/** 传送带上移动的待落蛋糕 */
interface MovingLayer {
  x: number;
  width: number;
  color: string;
  topSprinkle: string;
  direction: 1 | -1;
}

/** 掉下去的蛋糕（动画用） */
interface FallingLayer {
  x: number;
  y: number;
  width: number;
  color: string;
  vy: number;
  rot: number;
  spin: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; color: string;
  size: number;
}

// ===== 难度参数 =====
const GOAL_LAYERS = 12;     // 要叠到 12 层
const MAX_LIVES = 3;
const LAYER_HEIGHT = 22;    // 蛋糕层厚度
const LAYER_WIDTH = 120;    // 蛋糕层宽度
const PERFECT_TOLERANCE = 0.1;   // 完美对齐：偏移 < 宽度 10%
const OK_TOLERANCE = 0.35;       // 还能叠住：偏移 < 宽度 35%
const CONVEYOR_SPEED = 260;      // 传送带速度 px/s
const BASE_X = LAYER_WIDTH / 2;  // 传送带最左
const MAX_X_OFFSET = 1;          // 传送带最右相对 W 的位置系数

const CAKE_COLORS = [
  { cake: '#ffc2d1', top: '#fff1f3' }, // 粉色
  { cake: '#fff4b0', top: '#fffde0' }, // 柠檬黄
  { cake: '#c8e6a0', top: '#f0fce0' }, // 抹茶绿
  { cake: '#b99a6d', top: '#f5e6c8' }, // 巧克力
  { cake: '#d4b5e3', top: '#f4e6fa' }, // 香芋紫
  { cake: '#ffb5a7', top: '#fff3ee' }, // 珊瑚橙
];

/** 第 3 关 · 叠蛋糕：在合适时机点击，把蛋糕一层层叠到塔顶 */
export function CakeScene() {
  const { status, countdown, nextLevelTitle, isLast, win, lose, onWin } = useLevelFlow('cake');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const gameRef = useRef<{
    stack: StackedLayer[];       // 塔顶蛋糕层们（stack[0] 是最底层）
    moving: MovingLayer | null;  // 传送带上的蛋糕
    falling: FallingLayer[];     // 掉落中的失败蛋糕
    particles: Particle[];
    lives: number;
    perfectCombo: number;
    bestCombo: number;
    startTime: number;
    won: boolean;
    conveyorY: number;           // 传送带 y 坐标
    stackBaseY: number;          // 塔顶基准线（最底层蛋糕顶部 y）
  } | null>(null);
  const statusRef = useRef<'playing' | 'win' | 'lose'>('playing');
  const [hud, setHud] = useState({ layers: 0, lives: MAX_LIVES, combo: 0 });

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
        // 初始：蛋糕底托固定在屏幕底部中央
        const baseX = W / 2;
        // 传送带位置：让玩家视野同时看到传送带和塔顶的目标位置
        const conveyorY = H * 0.35;
        // 塔基高度：给底部留安全边距
        const stackBaseY = H - 60;
        // 先铺 2 层基座，让玩家在已有基础上叠
        const baseCake1 = CAKE_COLORS[3];
        const baseCake2 = CAKE_COLORS[0];
        gameRef.current = {
          stack: [
            { x: baseX, width: LAYER_WIDTH, color: baseCake1.cake, topSprinkle: baseCake1.top },
            { x: baseX, width: LAYER_WIDTH - 10, color: baseCake2.cake, topSprinkle: baseCake2.top },
          ],
          moving: null,
          falling: [],
          particles: [],
          lives: MAX_LIVES,
          perfectCombo: 0,
          bestCombo: 0,
          startTime: performance.now(),
          won: false,
          conveyorY,
          stackBaseY,
        };
        spawnNextCake();
      } else {
        // resize 时确保塔基居中
        const g = gameRef.current;
        const newCenterX = W / 2;
        const shift = newCenterX - (g.stack[0]?.x ?? newCenterX);
        for (const s of g.stack) s.x += shift;
        g.conveyorY = H * 0.35;
        g.stackBaseY = H - 60;
      }
    }

    function randomCakeColor() {
      return CAKE_COLORS[Math.floor(Math.random() * CAKE_COLORS.length)];
    }

    function spawnNextCake() {
      const g = gameRef.current!;
      const c = randomCakeColor();
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      // 初始位置：根据方向从一端出发
      const startX = dir === 1 ? BASE_X : W * MAX_X_OFFSET - LAYER_WIDTH / 2;
      g.moving = {
        x: startX,
        width: LAYER_WIDTH,
        color: c.cake,
        topSprinkle: c.top,
        direction: dir,
      };
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let last = performance.now();

    function burstPerfect(x: number, y: number) {
      const g = gameRef.current!;
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 80 + Math.random() * 180;
        g.particles.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
          life: 0.6 + Math.random() * 0.5,
          color: ['#ffd700', '#fff', '#ffb5a7', '#c8e6a0'][Math.floor(Math.random() * 4)],
          size: 3 + Math.random() * 3,
        });
      }
    }

    function burstFail(x: number, y: number) {
      const g = gameRef.current!;
      for (let i = 0; i < 12; i++) {
        const a = Math.PI / 2 + (Math.random() - 0.5) * Math.PI; // 主要向下
        const sp = 60 + Math.random() * 120;
        g.particles.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 100,
          life: 0.5 + Math.random() * 0.4,
          color: ['#fff', '#e0c9a0'][Math.floor(Math.random() * 2)],
          size: 2 + Math.random() * 2,
        });
      }
    }

    function update(dt: number) {
      const g = gameRef.current;
      if (!g || g.won) return;

      // 更新传送带上的蛋糕
      if (g.moving) {
        const m = g.moving;
        m.x += m.direction * CONVEYOR_SPEED * dt;
        const minX = BASE_X;
        const maxX = W * MAX_X_OFFSET - LAYER_WIDTH / 2;
        if (m.x <= minX) { m.x = minX; m.direction = 1; }
        if (m.x >= maxX) { m.x = maxX; m.direction = -1; }
      }

      // 更新掉落中的蛋糕
      for (let i = g.falling.length - 1; i >= 0; i--) {
        const f = g.falling[i];
        f.vy += 1000 * dt; // 重力
        f.y += f.vy * dt;
        f.rot += f.spin * dt;
        if (f.y > H + 60) g.falling.splice(i, 1);
      }

      // 粒子
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.vy += 200 * dt; // 轻微重力
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.98; p.vy *= 0.98;
        p.life -= dt;
        if (p.life <= 0) g.particles.splice(i, 1);
      }

      // HUD 更新
      const hudLayers = Math.max(0, g.stack.length - 2);
      setHud((h) => (h.layers !== hudLayers || h.lives !== g!.lives || h.combo !== g!.perfectCombo
        ? { layers: hudLayers, lives: g!.lives, combo: g!.perfectCombo } : h));
    }

    function dropCake() {
      const g = gameRef.current!;
      if (!g.moving || g.won || statusRef.current !== 'playing') return;

      const m = g.moving;
      const currentTop = g.stack[g.stack.length - 1]; // 塔顶
      const targetY = g.stackBaseY - g.stack.length * LAYER_HEIGHT + LAYER_HEIGHT / 2;
      const dropY = g.conveyorY; // 蛋糕从传送带位置下落到 targetY

      // 水平偏移：对比塔顶中心和下落蛋糕中心
      const offset = m.x - currentTop.x;
      const ratio = Math.abs(offset) / m.width;

      if (ratio > OK_TOLERANCE) {
        // === 失败：蛋糕掉下去 ===
        g.lives -= 1;
        g.perfectCombo = 0;
        audio.play('bad');
        // 做成掉落动画
        g.falling.push({
          x: m.x, y: dropY, width: m.width, color: m.color,
          vy: -100, rot: 0, spin: (Math.random() - 0.5) * 4,
        });
        burstFail(m.x, dropY + LAYER_HEIGHT / 2);
        g.moving = null;

        if (g.lives <= 0) {
          g.won = true; // 防止再次点击
          lose();
          return;
        }
        // 下一帧生成新蛋糕
        setTimeout(() => spawnNextCake(), 400);
      } else {
        // === 成功：叠上去 ===
        let placedX = m.x;
        if (ratio < PERFECT_TOLERANCE) {
          // 完美：自动对齐到塔顶中心，让玩家手感好
          placedX = currentTop.x;
          g.perfectCombo += 1;
          if (g.perfectCombo > g.bestCombo) g.bestCombo = g.perfectCombo;
          audio.play('match'); // 完美的"叮"
          burstPerfect(placedX, targetY);
        } else {
          // 还行：保持偏移位置叠，但如果偏移方向持续，限制倾斜
          // 允许一点倾斜但不能偏离上一层太多（最大偏移锁定）
          const maxOffset = currentTop.width * 0.3;
          if (Math.abs(offset) > maxOffset) {
            placedX = currentTop.x + Math.sign(offset) * maxOffset;
          }
          g.perfectCombo = 0;
          audio.play('good'); // 普通"啵"
          burstFail(placedX, targetY); // 小粒子表示落稳
        }

        // 若偏移过大导致宽度缩减（蛋糕被切掉一角）——简化：缩小宽度
        let placedWidth = m.width;
        if (ratio > PERFECT_TOLERANCE) {
          // 稍微缩小一点，体现"歪了"
          placedWidth = m.width - Math.abs(offset) * 0.5;
        }

        g.stack.push({
          x: placedX,
          width: Math.max(60, placedWidth),
          color: m.color,
          topSprinkle: m.topSprinkle,
        });
        g.moving = null;

        // 胜利判定（从基座 2 层开始，玩家要叠 GOAL_LAYERS 层）
        const playerLayers = g.stack.length - 2;
        if (playerLayers >= GOAL_LAYERS) {
          g.won = true;
          audio.play('victory');
          win();
          return;
        }
        // 生成下一个
        setTimeout(() => spawnNextCake(), 300);
      }
    }

    function draw() {
      const g = gameRef.current;
      if (!g) return;
      ctx.clearRect(0, 0, W, H);

      // 温馨暖色背景
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#ffd9b3');
      bg.addColorStop(0.6, '#ffe9cc');
      bg.addColorStop(1, '#f7c59f');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // 背景装饰：糖粒、小星星点缀
      for (let i = 0; i < 24; i++) {
        const sx = (i * 97 + 13) % W;
        const sy = (i * 53 + 27) % H;
        ctx.fillStyle = `rgba(255,182,193,${0.2 + (i % 3) * 0.1})`;
        ctx.beginPath(); ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
      }

      // 画传送带
      drawConveyor();

      // 画蛋糕塔
      drawCakeStack();

      // 画传送带上的蛋糕
      if (g.moving) drawCakeLayer(g.moving.x, g.conveyorY, g.moving.width, LAYER_HEIGHT, g.moving.color, g.moving.topSprinkle, 0);

      // 画掉落中的蛋糕
      for (const f of g.falling) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        drawCakeLayer(0, 0, f.width, LAYER_HEIGHT, f.color, '#fff', 1);
        ctx.restore();
      }

      // 画粒子
      for (const p of g.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawConveyor() {
      const g = gameRef.current!;
      const y = g.conveyorY;
      const leftX = BASE_X - LAYER_WIDTH / 2 - 20;
      const rightX = W * MAX_X_OFFSET - LAYER_WIDTH / 2 + 20;

      // 传送带支架
      ctx.fillStyle = '#8b6f47';
      ctx.fillRect(leftX - 10, y + 6, rightX - leftX + 20, 10);

      // 传送带面（横向条纹滚动）
      ctx.fillStyle = '#4a3a2a';
      ctx.fillRect(leftX, y - 4, rightX - leftX, 12);
      const stripeOffset = ((performance.now() / 80) % 24);
      ctx.fillStyle = '#6b5236';
      for (let sx = leftX + stripeOffset; sx < rightX; sx += 24) {
        ctx.fillRect(sx, y - 4, 10, 12);
      }

      // 两端滚轮
      ctx.fillStyle = '#2a1f15';
      ctx.beginPath(); ctx.arc(leftX, y + 2, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(rightX, y + 2, 8, 0, Math.PI * 2); ctx.fill();
    }

    function drawCakeStack() {
      const g = gameRef.current!;
      let y = g.stackBaseY - LAYER_HEIGHT / 2;

      // 先画最底层托盘
      const base = g.stack[0];
      ctx.fillStyle = '#c9a96e';
      ctx.fillRect(base.x - base.width / 2 - 10, y + LAYER_HEIGHT / 2 - 2, base.width + 20, 8);
      ctx.strokeStyle = '#7a5e35'; ctx.lineWidth = 2;
      ctx.strokeRect(base.x - base.width / 2 - 10, y + LAYER_HEIGHT / 2 - 2, base.width + 20, 8);

      for (const layer of g.stack) {
        drawCakeLayer(layer.x, y, layer.width, LAYER_HEIGHT, layer.color, layer.topSprinkle);
        y -= LAYER_HEIGHT;
      }

      // 塔顶画蜡烛
      if (g.stack.length >= 3) {
        const top = g.stack[g.stack.length - 1];
        const candleY = y + LAYER_HEIGHT / 2;
        if (g.stack.length >= 5) {
          // 5 根（偶数+居中）
          drawCandle(top.x - 28, candleY);
          drawCandle(top.x - 14, candleY);
          drawCandle(top.x, candleY);
          drawCandle(top.x + 14, candleY);
          drawCandle(top.x + 28, candleY);
        } else {
          // 3 根
          drawCandle(top.x - 18, candleY);
          drawCandle(top.x, candleY);
          drawCandle(top.x + 18, candleY);
        }
      }
    }

    function drawCakeLayer(
      cx: number, cy: number, width: number, height: number,
      cakeColor: string, topColor: string,
      tint = 0, // 0 正常，1 掉落灰暗
    ) {
      ctx.save();
      // 蜡笔感阴影
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;

      // 蛋糕主体
      const grad = ctx.createLinearGradient(cx - width / 2, cy - height / 2, cx - width / 2, cy + height / 2);
      grad.addColorStop(0, lighten(cakeColor, 0.1));
      grad.addColorStop(1, tint > 0 ? darken(cakeColor, 0.3) : cakeColor);
      ctx.fillStyle = grad;

      rRect(ctx, cx - width / 2, cy - height / 2, width, height, 6);
      ctx.fill();

      // 描边
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(58,31,13,0.6)';
      ctx.lineWidth = 1.5;
      rRect(ctx, cx - width / 2, cy - height / 2, width, height, 6);
      ctx.stroke();

      // 顶部奶油边（波浪）
      ctx.fillStyle = topColor;
      ctx.beginPath();
      const waveCount = Math.max(4, Math.floor(width / 18));
      const step = width / waveCount;
      ctx.moveTo(cx - width / 2, cy - height / 2 + 3);
      for (let i = 0; i < waveCount; i++) {
        const x1 = cx - width / 2 + i * step + step / 2;
        const x2 = cx - width / 2 + (i + 1) * step;
        ctx.quadraticCurveTo(x1, cy - height / 2 - 4, x2, cy - height / 2 + 3);
      }
      ctx.lineTo(cx + width / 2, cy - height / 2 + 8);
      ctx.lineTo(cx - width / 2, cy - height / 2 + 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(58,31,13,0.4)'; ctx.lineWidth = 1;
      ctx.stroke();

      // 糖粒点缀
      for (let i = 0; i < 5; i++) {
        const spx = cx - width / 2 + 8 + (i + 0.5) * ((width - 16) / 5);
        const spy = cy - 2;
        ctx.fillStyle = ['#ff6b9d', '#ffd56b', '#6bcbff', '#a3e635', '#ffffff'][i % 5];
        ctx.beginPath(); ctx.arc(spx, spy, 1.8, 0, Math.PI * 2); ctx.fill();
      }

      ctx.restore();
    }

    function drawCandle(x: number, y: number) {
      // 火焰
      const flicker = Math.sin(performance.now() / 80 + x) * 2;
      ctx.fillStyle = '#ff7a00';
      ctx.beginPath();
      ctx.moveTo(x, y - 12 + flicker);
      ctx.quadraticCurveTo(x - 5, y - 6, x, y - 1);
      ctx.quadraticCurveTo(x + 5, y - 6, x, y - 12 + flicker);
      ctx.fill();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.moveTo(x, y - 8 + flicker * 0.5);
      ctx.quadraticCurveTo(x - 2, y - 5, x, y - 2);
      ctx.quadraticCurveTo(x + 2, y - 5, x, y - 8 + flicker * 0.5);
      ctx.fill();
      // 烛身
      ctx.fillStyle = '#e85a5a';
      ctx.fillRect(x - 2, y - 1, 4, 10);
      ctx.strokeStyle = '#a03333'; ctx.lineWidth = 1;
      ctx.strokeRect(x - 2, y - 1, 4, 10);
      // 烛芯
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x, y - 1); ctx.stroke();
    }

    function lighten(hex: string, amt: number): string {
      const { r, g, b } = hexToRgb(hex);
      return `rgb(${Math.min(255, r + 255 * amt) | 0},${Math.min(255, g + 255 * amt) | 0},${Math.min(255, b + 255 * amt) | 0})`;
    }
    function darken(hex: string, amt: number): string {
      const { r, g, b } = hexToRgb(hex);
      return `rgb(${Math.max(0, r - 255 * amt) | 0},${Math.max(0, g - 255 * amt) | 0},${Math.max(0, b - 255 * amt) | 0})`;
    }
    function hexToRgb(hex: string): { r: number; g: number; b: number } {
      const h = hex.replace('#', '');
      return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
      };
    }
    function rRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    // 点击/空格 → 落蛋糕
    const dropHandler = () => dropCake();
    canvas.addEventListener('pointerdown', dropHandler);
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'Enter') dropCake(); };
    window.addEventListener('keydown', onKey);

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
      canvas.removeEventListener('pointerdown', dropHandler);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SceneShell title="叠蛋糕" levelId="cake" status={status} countdown={countdown} nextLevelTitle={nextLevelTitle} isLast={isLast} onWin={onWin}
      resultTitle={status === 'win' ? '🎂 完美蛋糕塔！' : '蛋糕掉地上了…'}
      resultSubtitle={status === 'win' ? '层层叠叠，每一口都是幸福！' : '差一点点，再来一次就稳了！'}>
      <div ref={wrapRef} style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }} />
      </div>
      {status === 'playing' && (
        <div style={{ position: 'absolute', top: 'calc(var(--hud-h) + 6px)', right: 10, textAlign: 'right', zIndex: 15, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ background: 'rgba(255,247,224,0.92)', border: '2px solid #3a1f0d', borderRadius: 12, padding: '2px 10px', fontSize: 16, fontWeight: 'bold' }}>
            🍰 {hud.layers}/{GOAL_LAYERS}
          </span>
          <span style={{ background: 'rgba(255,247,224,0.92)', border: '2px solid #3a1f0d', borderRadius: 12, padding: '2px 10px', fontSize: 16, fontWeight: 'bold' }}>
            {'❤️'.repeat(hud.lives)}{'🤍'.repeat(MAX_LIVES - hud.lives)}
          </span>
          {hud.combo > 1 && (
            <span style={{ background: 'rgba(255,215,0,0.92)', border: '2px solid #b8860b', borderRadius: 12, padding: '2px 10px', fontSize: 16, fontWeight: 'bold', color: '#6b4f00' }}>
              ✨ 完美 ×{hud.combo}
            </span>
          )}
        </div>
      )}
    </SceneShell>
  );
}
