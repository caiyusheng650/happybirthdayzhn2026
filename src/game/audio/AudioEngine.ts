// Web Audio 程序化合成音效引擎，不依赖外部音频文件
type SoundName =
  | 'jump'
  | 'beam'
  | 'hit'
  | 'good'
  | 'bad'
  | 'flip'
  | 'match'
  | 'mismatch'
  | 'click'
  | 'victory'
  | 'woosh'
  | 'firework';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  /** 初始化音频上下文（需由用户手势触发） */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  /** 播放音效 */
  play(name: SoundName) {
    this.ensure();
    if (this.muted || !this.ctx || !this.master) return;
    switch (name) {
      case 'jump':
        this.tone([{ f: 320, t: 0, d: 0.12 }, { f: 520, t: 0.06, d: 0.12 }], 'square');
        break;
      case 'beam':
        this.tone([{ f: 1800, t: 0, d: 0.2 }, { f: 900, t: 0.08, d: 0.25 }], 'sawtooth');
        break;
      case 'hit':
        this.tone([{ f: 700, t: 0, d: 0.15 }, { f: 300, t: 0.05, d: 0.18 }], 'triangle', 0.18);
        break;
      case 'good':
        this.tone([{ f: 660, t: 0, d: 0.12 }, { f: 880, t: 0.08, d: 0.14 }], 'sine', 0.2);
        break;
      case 'bad':
        this.tone([{ f: 200, t: 0, d: 0.25 }], 'sawtooth');
        break;
      case 'flip':
        this.tone([{ f: 500, t: 0, d: 0.08 }], 'triangle');
        break;
      case 'match':
        this.tone([{ f: 523, t: 0, d: 0.1 }, { f: 784, t: 0.09, d: 0.18 }], 'sine');
        break;
      case 'mismatch':
        this.noise({ duration: 0.2, freq: 900 });
        break;
      case 'click':
        this.tone([{ f: 600, t: 0, d: 0.06 }], 'square');
        break;
      case 'woosh':
        this.noise({ duration: 0.3, freq: 1200, lowpass: 600 });
        break;
      case 'firework':
        this.noise({ duration: 0.4, freq: 2000, lowpass: 800 });
        this.tone([{ f: 200, t: 0, d: 0.3 }, { f: 60, t: 0.05, d: 0.35 }], 'sine');
        break;
      case 'victory':
        this.tone(
          [
            { f: 523, t: 0, d: 0.15 },
            { f: 659, t: 0.16, d: 0.15 },
            { f: 784, t: 0.32, d: 0.2 },
            { f: 1046, t: 0.52, d: 0.5 },
          ],
          'triangle'
        );
        break;
    }
  }

  /** 串行音调 */
  private tone(
    steps: { f: number; t: number; d: number }[],
    type: OscillatorType,
    level = 0.35
  ) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    steps.forEach((s) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(s.f, now + s.t);
      gain.gain.setValueAtTime(0.0001, now + s.t);
      gain.gain.exponentialRampToValueAtTime(level, now + s.t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + s.t + s.d);
      osc.connect(gain).connect(this.master!);
      osc.start(now + s.t);
      osc.stop(now + s.t + s.d + 0.02);
    });
  }

  /** 噪声（吹气/爆炸/打发） */
  private noise(opts: { duration: number; freq: number; lowpass?: number }) {
    if (!this.ctx || !this.master) return;
    const { duration, freq, lowpass } = opts;
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = lowpass ? 'lowpass' : 'bandpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.4;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
  }
  /**
   * 播放背景音乐：D 大调卡农的摇滚化改作（公有领域和声，Canon Rock 风格）。
   * 在 delaySec 秒后开始，按传入的旋律音符铺底演奏，返回淡出停止函数。
   */
  startCanon(delaySec: number, notes: CanonNote[], bpm: number, keyRoot = 62): () => void {
    this.ensure();
    if (!this.ctx || !this.master) return () => {};
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delaySec;
    const beat = 60 / bpm;

    const musicGain = ctx.createGain();
    musicGain.gain.value = 1;
    musicGain.connect(this.master);

    const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

    // 和弦进行 I–V–vi–iii–IV–I–IV–V，按传入调号生成，每和弦 2 拍
    const SCALE = [0, 2, 4, 5, 7, 9, 11];
    const deg = (d: number) => keyRoot + SCALE[d % 7] + Math.floor(d / 7) * 12;
    const chords = [0, 4, 5, 2, 3, 0, 3, 4].map((d) => ({
      root: deg(d) - 24,
      fifth: deg(d + 4) - 24,
      triad: [deg(d), deg(d + 2), deg(d + 4)],
    }));

    const note = (m: number, at: number, d: number, type: OscillatorType, g: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq(m);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(g, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + d);
      osc.connect(gain).connect(musicGain);
      osc.start(at);
      osc.stop(at + d + 0.05);
    };

    const lastBeat = notes.length ? Math.max(...notes.map((n) => n.beat)) + 1 : 0;
    const loops = Math.ceil(lastBeat / 16);

    // === 乐器层 1：低频贝斯（三角波，八分，驱动感） ===
    for (let loop = 0; loop < loops; loop++) {
      for (let c = 0; c < 8; c++) {
        const sb = loop * 16 + c * 2;
        if (sb >= lastBeat) break;
        const at = t0 + sb * beat;
        const ch = chords[c];
        for (let k = 0; k < 4; k++) {
          if (sb + k * 0.5 >= lastBeat) break;
          note(k % 2 ? ch.fifth : ch.root, at + k * beat * 0.5, beat * 0.48, 'triangle', 0.18);
        }
      }
    }

    // === 乐器层 2：分解和弦琶音（方形波，每拍一个，亮色） ===
    for (let loop = 0; loop < loops; loop++) {
      for (let c = 0; c < 8; c++) {
        const sb = loop * 16 + c * 2;
        if (sb >= lastBeat) break;
        const at = t0 + sb * beat;
        const ch = chords[c];
        // 和弦三个音轮流琶音：下拍、半拍、下下拍、半拍
        for (let k = 0; k < 4; k++) {
          if (sb + k * 0.5 >= lastBeat) break;
          note(ch.triad[k % 3], at + k * beat * 0.5, beat * 0.45, 'square', 0.07);
        }
      }
    }

    // === 乐器层 3：低频铺底（正弦波，柔和持续） ===
    for (let loop = 0; loop < loops; loop++) {
      for (let c = 0; c < 8; c++) {
        const sb = loop * 16 + c * 2;
        if (sb >= lastBeat) break;
        const at = t0 + sb * beat;
        const ch = chords[c];
        for (const m of ch.triad) note(m, at, beat * 1.9, 'sine', 0.04);
      }
    }

    // === 乐器层 4：轻量打击乐（用噪声模拟 hihat，每拍一次） ===
    const hihatGain = ctx.createGain();
    hihatGain.gain.value = 0.08;
    hihatGain.connect(musicGain);
    for (let b = 0; b < lastBeat; b++) {
      if (b >= lastBeat) break;
      const at = t0 + b * beat;
      // 每拍 hihat
      const bufSize = Math.floor(ctx.sampleRate * 0.04);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const flt = ctx.createBiquadFilter();
      flt.type = 'highpass';
      flt.frequency.value = 6000;
      src.connect(flt).connect(hihatGain);
      src.start(at);
      src.stop(at + 0.06);
      // 下拍 kick
      if (b % 4 === 0) {
        const kBufSize = Math.floor(ctx.sampleRate * 0.12);
        const kBuf = ctx.createBuffer(1, kBufSize, ctx.sampleRate);
        const kd = kBuf.getChannelData(0);
        for (let i = 0; i < kBufSize; i++) kd[i] = (Math.random() * 2 - 1) * (1 - i / kBufSize) * 0.6;
        const kSrc = ctx.createBufferSource();
        kSrc.buffer = kBuf;
        const kFlt = ctx.createBiquadFilter();
        kFlt.type = 'lowpass';
        kFlt.frequency.value = 120;
        const kG = ctx.createGain();
        kG.gain.value = 0.25;
        kSrc.connect(kFlt).connect(kG).connect(musicGain);
        kSrc.start(at);
        kSrc.stop(at + 0.14);
      }
    }

    // === 旋律/按键音（与谱面一一对应） ===
    for (const n of notes) {
      const at = t0 + n.beat * beat;
      if (n.role === 'lead') note(n.midi, at, beat * 0.92, 'triangle', 0.3);
      else if (n.role === 'harmony') note(n.midi, at, beat * 0.92, 'sine', 0.12);
      else note(n.midi, at, beat * 0.5, 'triangle', 0.14);
    }

    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      const now = ctx.currentTime;
      musicGain.gain.setValueAtTime(musicGain.gain.value, now);
      musicGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
      window.setTimeout(() => musicGain.disconnect(), 800);
    };
  }

  /**
   * 播放《野蜂飞舞》——多乐器编排：
   * 1. 主音：快速十六分音符半音下行（三角波，明亮）
   * 2. 弦乐铺底：持续和弦（锯齿波 + 低通 + 慢包络，模拟弦乐合奏）
   * 3. 拨奏：每 2 拍一个短和弦（方形波 + 快速包络，像吉他拨弦）
   * 4. 贝斯：八分音符驱动（三角波，低频）
   * 5. 打击乐：轻量 hihat + 下拍 kick
   * 6. 蜂鸣音效：周期性短噪声滤波（模拟蜜蜂振翅）
   */
  startBumblebee(delaySec: number, notes: CanonNote[], bpm: number): () => void {
    this.ensure();
    if (!this.ctx || !this.master) return () => {};
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delaySec;
    const beat = 60 / bpm;

    const musicGain = ctx.createGain();
    musicGain.gain.value = 1;
    musicGain.connect(this.master);

    const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

    const note = (m: number, at: number, d: number, type: OscillatorType, g: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq(m);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(g, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + d);
      osc.connect(gain).connect(musicGain);
      osc.start(at);
      osc.stop(at + d + 0.05);
    };

    const lastBeat = notes.length ? Math.max(...notes.map((n) => n.beat)) + 1 : 0;

    // === 乐器层 2：弦乐铺底（锯齿波 + 低通 + 慢包络，模拟弦乐合奏长音） ===
    // A 小调和弦循环：Am - E - Dm - E
    const amTriad = [69, 72, 76];       // A-C-E
    const eTriad = [64, 68, 71];        // E-G#-B
    const dmTriad = [62, 65, 69];       // D-F-A
    const stringsCycle = [amTriad, eTriad, dmTriad, eTriad];
    for (let b = 0; b < lastBeat; b += 2) {
      if (b >= lastBeat) break;
      const at = t0 + b * beat;
      const triad = stringsCycle[Math.floor(b / 2) % stringsCycle.length];
      for (const m of triad) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 3500;
        osc.type = 'sawtooth';
        osc.frequency.value = freq(m - 12); // 低八度弦乐
        // 慢 attack（模拟弦乐起音）
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.linearRampToValueAtTime(0.08, at + 0.3);
        gain.gain.linearRampToValueAtTime(0.0001, at + beat * 1.9);
        osc.connect(lp).connect(gain).connect(musicGain);
        osc.start(at);
        osc.stop(at + beat * 2 + 0.1);
      }
    }

    // === 乐器层 3：贝斯驱动（三角波，八分音符） ===
    const bassCycle = [45, 52, 50, 52]; // A2, E3, D3, E3
    for (let b = 0; b < lastBeat; b += 0.5) {
      if (b >= lastBeat) break;
      const at = t0 + b * beat;
      const bassNote = bassCycle[Math.floor(b / 2) % bassCycle.length];
      note(bassNote, at, beat * 0.45, 'triangle', 0.15);
    }

    // === 乐器层 5：打击乐（hihat + kick） ===
    const hihatGain = ctx.createGain();
    hihatGain.gain.value = 0.06;
    hihatGain.connect(musicGain);
    for (let b = 0; b < lastBeat; b++) {
      if (b >= lastBeat) break;
      const at = t0 + b * beat;
      // hihat（每拍）
      const bufSize = Math.floor(ctx.sampleRate * 0.03);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const flt = ctx.createBiquadFilter();
      flt.type = 'highpass';
      flt.frequency.value = 7000;
      src.connect(flt).connect(hihatGain);
      src.start(at);
      src.stop(at + 0.04);
      // kick（每 4 拍下拍）
      if (b % 4 === 0) {
        const kBufSize = Math.floor(ctx.sampleRate * 0.1);
        const kBuf = ctx.createBuffer(1, kBufSize, ctx.sampleRate);
        const kd = kBuf.getChannelData(0);
        for (let i = 0; i < kBufSize; i++) kd[i] = (Math.random() * 2 - 1) * (1 - i / kBufSize) * 0.5;
        const kSrc = ctx.createBufferSource();
        kSrc.buffer = kBuf;
        const kFlt = ctx.createBiquadFilter();
        kFlt.type = 'lowpass';
        kFlt.frequency.value = 150;
        const kG = ctx.createGain();
        kG.gain.value = 0.2;
        kSrc.connect(kFlt).connect(kG).connect(musicGain);
        kSrc.start(at);
        kSrc.stop(at + 0.12);
      }
    }

    // === 乐器层 6：蜂鸣音效（周期性短噪声，模拟蜜蜂振翅） ===
    for (let b = 0; b < lastBeat; b += 0.5) {
      if (b >= lastBeat) break;
      const at = t0 + b * beat;
      const buzzLen = 0.05;
      const buzzBufSize = Math.floor(ctx.sampleRate * buzzLen);
      const buzzBuf = ctx.createBuffer(1, buzzBufSize, ctx.sampleRate);
      const buzzData = buzzBuf.getChannelData(0);
      for (let i = 0; i < buzzBufSize; i++) {
        // 快速衰减的噪声 + 轻微正弦调制，模拟振翅
        const t = i / ctx.sampleRate;
        buzzData[i] = (Math.random() * 2 - 1) * Math.exp(-t * 80) * 0.5
                    + Math.sin(2 * Math.PI * 180 * t) * 0.15 * Math.exp(-t * 30);
      }
      const buzzSrc = ctx.createBufferSource();
      buzzSrc.buffer = buzzBuf;
      const buzzFlt = ctx.createBiquadFilter();
      buzzFlt.type = 'bandpass';
      buzzFlt.frequency.value = 2000;
      buzzFlt.Q.value = 2;
      const buzzG = ctx.createGain();
      buzzG.gain.value = 0.08;
      buzzSrc.connect(buzzFlt).connect(buzzG).connect(musicGain);
      buzzSrc.start(at);
      buzzSrc.stop(at + buzzLen + 0.02);
    }

    // === 旋律/按键音（lead + harmony） ===
    for (const n of notes) {
      const at = t0 + n.beat * beat;
      if (n.role === 'lead') note(n.midi, at, beat * 0.22, 'triangle', 0.28);
      else if (n.role === 'harmony') note(n.midi, at, beat * 0.08, 'square', 0.08);
      else note(n.midi, at, beat * 0.4, 'triangle', 0.12);
    }

    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      const now = ctx.currentTime;
      musicGain.gain.setValueAtTime(musicGain.gain.value, now);
      musicGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
      window.setTimeout(() => musicGain.disconnect(), 800);
    };
  }
}

/** 旋律音符：beat 为拍数，midi 为音高，role 决定轨道与音色 */
export interface CanonNote { beat: number; midi: number; role: 'lead' | 'harmony' | 'bass' }

/** 简谱解析结果 */
export interface ParsedSong { notes: CanonNote[]; bpm: number; keyRoot: number }

const KEY_ROOTS: Record<string, number> = { C: 60, D: 62, E: 64, F: 65, G: 67, A: 69, B: 71 };
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

/**
 * 简谱解析器（重写版）。支持格式：
 * - 头部：`1=C`（调号）、`BPM=76`（速度），各占一行
 * - 单个音符：数字 1-7 为唱名，0 为休止；`'` 升八度、`,` 降八度（可叠加）
 * - 八度附点：`1·2` 表示前一个音附点（时值 ×1.5），后一个音缩短
 * - 时值标记：
 *   - 默认 1 拍（四分音符）
 *   - `/` 或 `_` 结尾 = 减时线（八分，0.5 拍）
 *   - `//` 或 `__` = 十六分（0.25 拍）
 *   - `-` 每加一个延长 1 拍
 *   - `.` 附点（在主音位置）
 * - 分隔多音：`3/2` 表示一拍内两个八分音符（3 在前半拍，2 在后半拍）
 *   类似地 `1/2/3/4` 表示四个十六分音符
 * - 小节线 `|` 与空白会被忽略
 *
 * 例（《岁月神偷》风格）：
 *   1=C
 *   BPM=76
 *   1 1 1 1 7 7 7 7 | 3/2 3/2 3 5 5 0 1/2
 */
export function parseJianpu(text: string): ParsedSong {
  let bpm = 90;
  let keyRoot = 62;
  const notes: CanonNote[] = [];
  let beat = 0;

  // 解析单个音符 token（如 "1'" "6/" "0" "3·" 等）
  const parseOne = (tok: string): { deg: number; marks: string[]; half: number; dot: boolean } | null => {
    const m = tok.match(/^(0|[1-7])([',]*)(\.?)(_*)$/);
    if (!m) return null;
    // half 来自尾部下划线数量（每个 _ 是一条减时线：1条=八分=×0.5，2条=十六=×0.25）
    const half = Math.pow(0.5, m[4].length);
    return { deg: Number(m[1]), marks: m[2].split(''), dot: !!m[3], half };
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const bpmMatch = line.match(/^BPM\s*=\s*(\d+)/i);
    if (bpmMatch) { bpm = Number(bpmMatch[1]); continue; }
    const keyMatch = line.match(/^1\s*=\s*([A-G])/i);
    if (keyMatch) { keyRoot = KEY_ROOTS[keyMatch[1].toUpperCase()] ?? 62; continue; }

    for (const token of line.split(/[\s|]+/)) {
      if (!token) continue;

      // token 可能是用 / 分隔的多个音：3/2 或 1/2/3/4
      // 也可能是带减时线的单音：3_ (八分) 或 3__ (十六)
      // 先检查是否有 / 分隔
      if (token.includes('/')) {
        const parts = token.split('/');
        // 推断每个 part 的基础时值
        // 如果有 2 个 part → 每个是 0.5 拍（八分）
        // 如果有 4 个 part → 每个是 0.25 拍（十六分）
        const perPart = 1 / parts.length;
        for (const part of parts) {
          if (!part) continue;
          const parsed = parseOne(part.trim());
          if (!parsed) continue;
          let dur = perPart;
          if (parsed.dot) dur *= 1.5;
          if (parsed.deg !== 0) {
            let oct = 0;
            for (let i = 0; i < parsed.marks.length; i++) {
              const ch = parsed.marks[i];
              if (ch === "'") oct += 1; else if (ch === ',') oct -= 1;
            }
            const midi = keyRoot + MAJOR_STEPS[parsed.deg - 1] + oct * 12;
            notes.push({ beat, midi, role: 'lead' });
          }
          beat += dur;
        }
      } else {
        const parsed = parseOne(token);
        if (!parsed) continue;
        let dur = parsed.half; // 来自下划线
        dur += (token.match(/-/g) || []).length; // 延音线
        if (parsed.dot) dur *= 1.5;
        if (parsed.deg !== 0) {
          let oct = 0;
          for (let i = 0; i < parsed.marks.length; i++) {
            const ch = parsed.marks[i];
            if (ch === "'") oct += 1; else if (ch === ',') oct -= 1;
          }
          const midi = keyRoot + MAJOR_STEPS[parsed.deg - 1] + oct * 12;
          notes.push({ beat, midi, role: 'lead' });
        }
        beat += dur;
      }
    }
  }

  // 调试日志：输出解析到多少个音，方便核对
  // eslint-disable-next-line no-console
  console.log('[parseJianpu] parsed', notes.length, 'lead notes, total beats ≈', beat.toFixed(1));

  return { notes, bpm, keyRoot };
}

/**
 * 加密叠层：给纯 lead 旋律自动叠加和声（低八度）和下拍低音，保持玩法密度。
 * 可选择力度：dense=每拍都叠，light=仅偶数拍叠和声
 */
export function enrichMelody(notes: CanonNote[], opts: { harmony: 'dense' | 'light'; bass: boolean } = { harmony: 'light', bass: true }): CanonNote[] {
  const result = notes.map((n) => ({ ...n }));
  for (const n of notes) {
    if (n.role !== 'lead') continue;
    if (opts.harmony === 'dense' || Math.round(n.beat) % 2 === 0) {
      result.push({ beat: n.beat, midi: n.midi - 12, role: 'harmony' });
    }
    if (opts.bass && Math.round(n.beat) % 4 === 0) {
      result.push({ beat: n.beat, midi: n.midi - 24, role: 'bass' });
    }
  }
  return result.sort((a, b) => a.beat - b.beat);
}

/**
 * 在这里粘贴简谱（非空时节奏关将演奏它，为空则回退到野蜂飞舞）。
 * 首行写调号与速度，例如：
 * 1=G
 * BPM=80
 * 然后逐行写唱名，`'` 高八度、`,` 低八度、`/` 八分音符、`-` 延长、0 休止。
 */
export const SONG_JIANPU = `
`;

/**
 * 歌曲选择：'bumblebee' = 野蜂飞舞，'canon' = 摇滚卡农，'jianpu' = 用户简谱
 * 想换歌改这里就行
 */
export const SONG_MODE: 'bumblebee' | 'canon' | 'jianpu' = 'canon';

/** 副歌起始拍（卡农用） */
export const CHORUS_BEAT = 32;

/** 主歌主题（D 大调，16 音，每拍一音） */
export const VERSE_THEME = [78, 74, 76, 73, 74, 71, 69, 67, 71, 67, 69, 66, 71, 67, 73, 69];

/** 副歌旋律 */
export const CHORUS_PHRASE = [86, 88, 89, 86, 84, 83, 81, 78, 86, 88, 89, 91, 89, 88, 86, 84];

/**
 * 编排整首卡农，谱面灵活分布（弱拍、附点、切分、琶音）：
 * - lead：主音旋律，不是每拍都有——穿插附点、切分、弱拍进入
 * - harmony：和声叠层，弱拍和半拍位置出现
 * - bass：重拍低音 + 弱拍填充，形成切分
 */
export function composeCanon(totalBeats: number): CanonNote[] {
  const notes: CanonNote[] = [];

  // 主歌：较简单，lead 在每 4 拍里的 1/3 拍（避开最硬的下拍），和声在半拍填充
  // 副歌：密集，lead + harmony 交错，还有十六分琶音
  // 用一个"节拍型"数组来控制哪些位置放什么角色

  const leadPatternVerse = [0, 2, 4, 6, 8, 10, 12, 14]; // 偶数拍（弱起）
  const harmonyPatternVerse = [1, 3, 5, 7, 9, 11, 13, 15]; // 奇数拍（和声）

  // 副歌更密：每拍都有 lead（但分布在不同偏移），还有十六分填充
  const leadPatternChorus = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const harmonyPatternChorus = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5];

  for (let b = 0; b < totalBeats; b += 16) {
    const chorus = b >= CHORUS_BEAT;
    const leadPats = chorus ? leadPatternChorus : leadPatternVerse;
    const harmPats = chorus ? harmonyPatternChorus : harmonyPatternVerse;
    const src = chorus ? CHORUS_PHRASE : VERSE_THEME;

    // lead
    for (const offset of leadPats) {
      const beat = b + offset;
      if (beat >= totalBeats) break;
      const leadMidi = src[beat % src.length];
      notes.push({ beat, midi: leadMidi, role: 'lead' });
      // 副歌：lead 后紧跟一个低八度十六分，形成快速装饰
      if (chorus && Math.random() < 0.4) {
        const decoBeat = beat + 0.25;
        if (decoBeat < totalBeats) {
          notes.push({ beat: decoBeat, midi: leadMidi - 7, role: 'lead' }); // 五度下行装饰
        }
      }
    }

    // harmony（和声叠层）
    for (const offset of harmPats) {
      const beat = b + offset;
      if (beat >= totalBeats) break;
      const harmMidi = src[Math.floor(beat) % src.length] - 12;
      notes.push({ beat, midi: harmMidi, role: 'harmony' });
    }

    // bass：重拍 + 切分（弱拍后半拍）
    const bassPattern = chorus ? [0, 3.5, 4, 7.5, 8, 11.5, 12, 15.5] : [0, 4, 8, 12];
    for (const offset of bassPattern) {
      const beat = b + offset;
      if (beat >= totalBeats) break;
      const bassMidi = src[Math.floor(beat) % src.length] - 24;
      notes.push({ beat, midi: bassMidi, role: 'bass' });
    }
  }

  return notes.sort((a, b) => a.beat - b.beat);
}

/**
 * 《野蜂飞舞》（Flight of the Bumblebee）—— A 小调，标志性极速半音下行
 * 原曲是十六分音符密集奔跑，这里为了节奏游戏可玩性调整密度：
 * - lead：每拍 2 个八分音符半音下行（约每秒 5 个，舒适密度）
 * - harmony：每 2 拍拨奏一个和弦（短方波，像吉他拨弦）
 * - bass：下拍低音驱动（三角波，八分音符）
 */
export function composeBumblebee(totalBeats: number): CanonNote[] {
  const notes: CanonNote[] = [];

  // A 小调半音序列：从 A(69) 开始连续半音下行，循环往复
  const SEMITONE_SEQ: number[] = [];
  for (let i = 0; i < 48; i++) SEMITONE_SEQ.push(69 - (i % 24) - 12 * Math.floor(i / 24));

  // lead：每拍 2 个八分音符（0 和 0.5 位置），半音下行
  // 约每秒 4.67 个（BPM 140），舒适可玩
  for (let b = 0; b < totalBeats; b++) {
    for (const k of [0, 2]) { // 只取 0 和 0.5（跳过 0.25 和 0.75）
      const subBeat = b + k * 0.25;
      if (subBeat >= totalBeats) break;
      const idx = Math.floor(subBeat * 4) % SEMITONE_SEQ.length;
      notes.push({ beat: subBeat, midi: SEMITONE_SEQ[idx], role: 'lead' });
    }
  }

  // harmony：每 2 拍拨奏一个 A 小调和弦
  const amChord = [69, 72, 76];       // A-C-E
  const eChord = [64, 68, 71];        // E-G#-B
  const dmChord = [62, 65, 69];       // D-F-A
  const bdimChord = [59, 62, 65];     // B-D-F
  const chordCycle = [amChord, eChord, dmChord, eChord, amChord, eChord, bdimChord, eChord];

  for (let b = 0; b < totalBeats; b += 2) {
    if (b >= totalBeats) break;
    const chord = chordCycle[(b / 2) % chordCycle.length];
    for (const m of chord) {
      notes.push({ beat: b, midi: m - 12, role: 'harmony' });
    }
  }

  // bass：下拍低音（A 小调根音循环），八分音符
  const bassCycle = [45, 52, 50, 52]; // A2, E3, D3, E3
  for (let b = 0; b < totalBeats; b += 0.5) {
    if (b >= totalBeats) break;
    const bassNote = bassCycle[Math.floor(b / 2) % bassCycle.length];
    notes.push({ beat: b, midi: bassNote, role: 'bass' });
  }

  return notes.sort((a, b) => a.beat - b.beat);
}

/** 单例音频引擎 */
export const audio = new AudioEngine();