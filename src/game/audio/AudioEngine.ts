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
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  /** 播放音效 */
  play(name: SoundName) {
    if (this.muted || !this.ctx || !this.master) return;
    switch (name) {
      case 'jump':
        this.tone([{ f: 320, t: 0, d: 0.12 }, { f: 520, t: 0.06, d: 0.12 }], 'square');
        break;
      case 'beam':
        this.tone([{ f: 1800, t: 0, d: 0.2 }, { f: 900, t: 0.08, d: 0.25 }], 'sawtooth');
        break;
      case 'hit':
        this.tone([{ f: 700, t: 0, d: 0.15 }, { f: 300, t: 0.05, d: 0.18 }], 'triangle');
        break;
      case 'good':
        this.tone([{ f: 660, t: 0, d: 0.12 }, { f: 880, t: 0.08, d: 0.14 }], 'sine');
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
    type: OscillatorType
  ) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    steps.forEach((s) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(s.f, now + s.t);
      gain.gain.setValueAtTime(0.0001, now + s.t);
      gain.gain.exponentialRampToValueAtTime(0.35, now + s.t + 0.01);
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
}

/** 单例音频引擎 */
export const audio = new AudioEngine();