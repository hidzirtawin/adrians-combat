export type SfxName =
  | 'pulse' | 'viper' | 'arx' | 'scatter' | 'longshot' | 'rail'
  | 'enemyShot' | 'hit' | 'kill' | 'explosion' | 'pickup' | 'reload'
  | 'empty' | 'dash' | 'wave' | 'ui' | 'lock' | 'damage' | 'boss' | 'gameover' | 'place'
  | 'blaster' | 'lightsaber' | 'hyperspace' | 'klaxon' | 'droid' | 'tie' | 'xwing' | 'force' | 'ion';

interface GunProfile {
  crack: number;
  crackFreq: number;
  bodyGain: number;
  bodyDur: number;
  bodyFreq: number;
  bodyEnd: number;
  thumpGain: number;
  thumpFreq: number;
  thumpDur: number;
  thumpEnd: number;
  tailGain: number;
  tailDur: number;
  electric?: boolean;
}

const GUN_PROFILES: Record<'pulse' | 'viper' | 'arx' | 'scatter' | 'longshot' | 'rail', GunProfile> = {
  pulse: { crack: 0.15, crackFreq: 3400, bodyGain: 0.1, bodyDur: 0.085, bodyFreq: 1800, bodyEnd: 300, thumpGain: 0.12, thumpFreq: 105, thumpDur: 0.14, thumpEnd: 42, tailGain: 0.055, tailDur: 0.34 },
  viper: { crack: 0.12, crackFreq: 4100, bodyGain: 0.075, bodyDur: 0.06, bodyFreq: 2400, bodyEnd: 420, thumpGain: 0.08, thumpFreq: 122, thumpDur: 0.1, thumpEnd: 55, tailGain: 0.04, tailDur: 0.24 },
  arx: { crack: 0.17, crackFreq: 3100, bodyGain: 0.13, bodyDur: 0.115, bodyFreq: 1500, bodyEnd: 220, thumpGain: 0.15, thumpFreq: 96, thumpDur: 0.17, thumpEnd: 38, tailGain: 0.07, tailDur: 0.42 },
  scatter: { crack: 0.13, crackFreq: 2700, bodyGain: 0.17, bodyDur: 0.19, bodyFreq: 900, bodyEnd: 140, thumpGain: 0.21, thumpFreq: 84, thumpDur: 0.22, thumpEnd: 30, tailGain: 0.1, tailDur: 0.52 },
  longshot: { crack: 0.21, crackFreq: 4500, bodyGain: 0.12, bodyDur: 0.09, bodyFreq: 1300, bodyEnd: 180, thumpGain: 0.12, thumpFreq: 88, thumpDur: 0.19, thumpEnd: 30, tailGain: 0.09, tailDur: 0.58 },
  rail: { crack: 0.18, crackFreq: 5200, bodyGain: 0.1, bodyDur: 0.1, bodyFreq: 2100, bodyEnd: 300, thumpGain: 0.1, thumpFreq: 80, thumpDur: 0.21, thumpEnd: 28, tailGain: 0.08, tailDur: 0.52, electric: true },
};

/** All sound is synthesized at runtime with the Web Audio API — zero audio assets. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private delay: DelayNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private reverbInput: ConvolverNode | null = null;
  private sampleBuffers = new Map<string, AudioBuffer>();
  private samplesRequested = false;
  private ambienceGain: GainNode | null = null;
  private ambienceNoise: AudioBufferSourceNode | null = null;
  private ambienceOsc: OscillatorNode | null = null;
  private droneHumGain: GainNode | null = null;
  private droneHumPanner: StereoPannerNode | null = null;
  private droneHumSources: AudioScheduledSourceNode[] = [];

  private musicTimer: number | null = null;
  private step = 0;
  private nextStepTime = 0;
  private musicOn = true;
  private paused = false;

  volume = 0.8;

  get ready(): boolean {
    return this.ctx !== null;
  }

  init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }

    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(ctx.destination);
    this.master = master;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 26;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    comp.connect(master);

    const sfx = ctx.createGain();
    sfx.gain.value = 0.72;
    sfx.connect(comp);
    this.sfxBus = sfx;

    const music = ctx.createGain();
    music.gain.value = this.musicOn ? 0.2 : 0;
    music.connect(master);
    this.musicBus = music;

    // Lush ping-pong-ish feedback delay for the arpeggio.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.317;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(music);
    this.delay = delay;

    // Reusable noise buffer.
    const length = Math.floor(ctx.sampleRate * 1.2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    void this.preloadSamples();

    // A synthesized room impulse for gunshots and explosions.
    const irLength = Math.floor(ctx.sampleRate * 1.7);
    const impulse = ctx.createBuffer(2, irLength, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < irLength; i++) {
        const decay = Math.pow(1 - i / irLength, 2.8);
        channelData[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.55;
    convolver.connect(reverbGain);
    reverbGain.connect(comp);
    this.reverbInput = convolver;
  }

  setVolume(value: number): void {
    this.volume = value;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
    }
  }

  setMusicEnabled(on: boolean): void {
    this.musicOn = on;
    if (this.musicBus && this.ctx) {
      this.musicBus.gain.setTargetAtTime(on && !this.paused ? 0.2 : 0, this.ctx.currentTime, 0.1);
    }
    if (on) this.startMusic();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (this.musicBus && this.ctx) {
      this.musicBus.gain.setTargetAtTime(this.musicOn && !paused ? 0.2 : 0, this.ctx.currentTime, 0.12);
    }
  }

  startMusic(): void {
    if (!this.ctx || !this.musicOn || this.musicTimer !== null) return;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(this.scheduleMusic, 80);
    this.scheduleMusic();
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleMusic = (): void => {
    const ctx = this.ctx;
    if (!ctx) return;
    const stepDur = 60 / 96 / 4;
    while (this.nextStepTime < ctx.currentTime + 0.25) {
      this.playStep(this.step, this.nextStepTime, stepDur);
      this.step = (this.step + 1) % 32;
      this.nextStepTime += stepDur;
    }
  };

  private playStep(step: number, time: number, stepDur: number): void {
    if (!this.ctx || !this.musicOn) return;

    // A minor: A C D E F G
    const bassPattern: Array<number | null> = [
      55, null, null, 55, null, null, 82.41, null,
      65.41, null, null, 65.41, null, null, 98, null,
      55, null, null, 55, null, null, 110, null,
      73.42, null, null, 73.42, null, null, 98, 110,
    ];
    const bass = bassPattern[step];
    if (bass) {
      this.tone(bass, time, stepDur * 2.4, 'sawtooth', 0.09, this.musicBus, 260);
      this.tone(bass * 2, time, stepDur * 1.5, 'sine', 0.05, this.musicBus);
    }

    const arpNotes = [440, 523.25, 659.25, 587.33, 523.25, 659.25, 880, 783.99];
    if (step % 2 === 0 && step % 8 !== 6) {
      const note = arpNotes[(step / 2) % arpNotes.length];
      this.tone(note, time, stepDur * 1.4, 'triangle', 0.028, this.musicBus, 3200);
      if (this.delay) {
        this.tone(note, time, stepDur * 0.7, 'triangle', 0.014, this.delay, 2600);
      }
    }

    // Warm pad chord every two bars.
    if (step === 0 || step === 16) {
      const chord = step === 0 ? [110, 164.81, 220, 261.63] : [98, 146.83, 196, 246.94];
      for (const f of chord) {
        this.tone(f, time, stepDur * 15.5, 'sawtooth', 0.018, this.musicBus, 900, 0.7);
      }
    }

    // Sparse kick / hat pulse.
    if (step % 8 === 0) this.noise(time, 0.12, 0.08, this.musicBus, 'lowpass', 180);
    if (step % 4 === 2) this.noise(time, 0.03, 0.02, this.musicBus, 'highpass', 7000);
  }

  private async preloadSamples(): Promise<void> {
    if (this.samplesRequested || !this.ctx) return;
    this.samplesRequested = true;
    const base = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;
    const names = ['pulse', 'viper', 'arx', 'scatter', 'longshot', 'rail', 'reload', 'pump'];
    await Promise.all(names.map(async (name) => {
      try {
        const response = await fetch(`${base}audio/${name}.wav`);
        if (!response.ok) return;
        const bytes = await response.arrayBuffer();
        const decoded = await this.ctx!.decodeAudioData(bytes);
        this.sampleBuffers.set(name, decoded);
      } catch (error) {
        console.warn(`[Audio] sample ${name} unavailable`, error);
      }
    }));
  }

  private playSample(name: string, time: number, dest: AudioNode, gain = 0.9, rate = 1): boolean {
    const ctx = this.ctx;
    const buffer = this.sampleBuffers.get(name);
    if (!ctx || !buffer) return false;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate * (0.97 + Math.random() * 0.06);
    const amp = ctx.createGain();
    amp.gain.value = gain;
    source.connect(amp);
    amp.connect(dest);
    source.start(time);
    source.onended = () => {
      source.disconnect();
      amp.disconnect();
    };
    return true;
  }

  play(name: SfxName, options?: { pan?: number; volume?: number }): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const sfxBus = this.sfxBus;
    if (!sfxBus) return;
    const t = ctx.currentTime;

    const pan = Math.max(-1, Math.min(1, options?.pan ?? 0));
    const volume = Math.max(0, Math.min(1, options?.volume ?? 1));

    // Every effect gets its own output so it can be panned and sent to reverb
    // without sharing a node with other sounds.
    const output = ctx.createGain();
    output.gain.value = volume;
    output.connect(sfxBus);

    let bus: AudioNode = output;
    let panner: StereoPannerNode | null = null;
    if (pan !== 0 && typeof ctx.createStereoPanner === 'function') {
      panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      panner.connect(output);
      bus = panner;
    }

    const reverbAmounts: Partial<Record<SfxName, number>> = {
      pulse: 0.2,
      viper: 0.17,
      arx: 0.22,
      scatter: 0.24,
      longshot: 0.28,
      rail: 0.26,
      explosion: 0.3,
      boss: 0.18,
      gameover: 0.22,
      enemyShot: 0.13,
      damage: 0.1,
      reload: 0.06,
      blaster: 0.2,
      lightsaber: 0.18,
      hyperspace: 0.3,
      klaxon: 0.16,
      droid: 0.08,
      tie: 0.14,
      xwing: 0.14,
      force: 0.3,
      ion: 0.2,
    };
    const wetAmount = reverbAmounts[name] ?? 0;
    let wet: GainNode | null = null;
    if (this.reverbInput && wetAmount > 0) {
      wet = ctx.createGain();
      wet.gain.value = wetAmount;
      output.connect(wet);
      wet.connect(this.reverbInput);
    }

    window.setTimeout(() => {
      try {
        panner?.disconnect();
        wet?.disconnect();
        output.disconnect();
      } catch {
        /* already disconnected */
      }
    }, 2800);

    switch (name) {
      case 'pulse':
        if (!this.playSample('pulse', t, bus, 0.95)) this.gunshot('pulse', bus);
        this.tone(1900, t, 0.075, 'sine', 0.012, bus, 7000, 0.001, 3200);
        break;
      case 'viper':
        if (!this.playSample('viper', t, bus, 0.9, 1.06)) this.gunshot('viper', bus);
        break;
      case 'arx':
        if (!this.playSample('arx', t, bus, 0.98)) this.gunshot('arx', bus);
        break;
      case 'scatter':
        if (!this.playSample('scatter', t, bus, 1.0, 0.96)) this.gunshot('scatter', bus);
        break;
      case 'longshot':
        if (!this.playSample('longshot', t, bus, 1.0, 0.98)) this.gunshot('longshot', bus);
        break;
      case 'rail':
        if (!this.playSample('rail', t, bus, 1.0, 0.9)) this.gunshot('rail', bus);
        this.tone(1800, t, 0.14, 'sawtooth', 0.035, bus, 7000, 0.001, 160);
        break;
      case 'enemyShot':
        this.tone(1320, t, 0.16, 'sawtooth', 0.045, bus, 4200, 0.001, 180);
        this.tone(660, t + 0.01, 0.13, 'square', 0.022, bus, 2600, 0.001, 120);
        this.noise(t, 0.07, 0.022, bus, 'bandpass', 1800, 500);
        break;
      case 'hit':
        this.tone(1750, t, 0.035, 'square', 0.045, bus, 6000);
        this.tone(2400, t + 0.015, 0.03, 'square', 0.03, bus, 7000);
        break;
      case 'kill':
        this.tone(880, t, 0.06, 'square', 0.04, bus, 4000);
        this.tone(1320, t + 0.05, 0.09, 'square', 0.035, bus, 5000);
        break;
      case 'explosion':
        this.noise(t, 0.7, 0.22, bus, 'lowpass', 2200, 90);
        this.tone(95, t, 0.55, 'sine', 0.18, bus, 600, 0.8, 32);
        this.tone(60, t + 0.02, 0.5, 'triangle', 0.1, bus, 300, 0.8, 26);
        this.noise(t + 0.05, 0.5, 0.07, bus, 'lowpass', 600, 100);
        break;
      case 'pickup':
        this.tone(660, t, 0.09, 'sine', 0.09, bus, 4000);
        this.tone(990, t + 0.07, 0.09, 'sine', 0.08, bus, 5000);
        this.tone(1320, t + 0.14, 0.16, 'sine', 0.07, bus, 6000);
        break;
      case 'reload':
        if (!this.playSample('reload', t, bus, 0.72, 1.12)) {
          this.noise(t, 0.045, 0.055, bus, 'bandpass', 2200);
          this.tone(300, t, 0.04, 'square', 0.02, bus, 900);
          this.noise(t + 0.19, 0.05, 0.06, bus, 'bandpass', 900);
          this.tone(115, t + 0.19, 0.09, 'sine', 0.065, bus, 350, 0.002, 55);
          this.noise(t + 0.4, 0.035, 0.045, bus, 'highpass', 3000);
          this.tone(2400, t + 0.4, 0.03, 'square', 0.015, bus, 8000);
        }
        break;
      case 'empty':
        this.tone(320, t, 0.045, 'square', 0.05, bus, 1000);
        break;
      case 'dash':
        this.noise(t, 0.3, 0.13, bus, 'highpass', 900, 5200);
        this.tone(180, t, 0.25, 'sine', 0.06, bus, 900, 0.7, 500);
        break;
      case 'wave':
        [220, 277.18, 329.63, 440].forEach((f, i) => {
          this.tone(f, t + i * 0.03, 0.8, 'sawtooth', 0.035, bus, 1400, 0.8);
        });
        break;
      case 'boss':
        this.tone(70, t, 1.1, 'sawtooth', 0.14, bus, 400, 0.7, 45);
        this.tone(110, t, 0.9, 'square', 0.05, bus, 500, 0.7, 55);
        break;
      case 'ui':
        this.tone(1200, t, 0.035, 'square', 0.022, bus, 5000);
        this.tone(1800, t + 0.025, 0.04, 'sine', 0.018, bus, 7000);
        this.tone(980, t + 0.06, 0.03, 'sine', 0.012, bus, 6000);
        break;
      case 'lock':
        this.tone(760, t, 0.06, 'sine', 0.04, bus, 5000);
        this.tone(1520, t + 0.06, 0.12, 'sine', 0.05, bus, 7000, 0.001, 1900);
        this.tone(2280, t + 0.16, 0.08, 'triangle', 0.025, bus, 9000);
        break;
      case 'damage':
        this.tone(140, t, 0.24, 'sawtooth', 0.12, bus, 700, 0.7, 60);
        this.noise(t, 0.18, 0.08, bus, 'lowpass', 900);
        break;
      case 'gameover':
        [330, 262, 196, 147].forEach((f, i) => {
          this.tone(f, t + i * 0.19, 0.55, 'triangle', 0.06, bus, 1500, 0.8);
        });
        break;
      case 'place':
        this.tone(220, t, 0.5, 'sine', 0.08, bus, 2400, 0.7, 880);
        this.tone(440, t + 0.2, 0.4, 'sine', 0.05, bus, 3000, 0.7, 1320);
        break;
      case 'blaster':
        this.tone(1320, t, 0.2, 'sawtooth', 0.055, bus, 5000, 0.001, 170);
        this.tone(640, t + 0.012, 0.16, 'square', 0.03, bus, 3200, 0.001, 110);
        this.noise(t, 0.08, 0.025, bus, 'bandpass', 1900, 700);
        break;
      case 'lightsaber':
        this.tone(82, t, 0.55, 'sawtooth', 0.055, bus, 320, 0.02, 160);
        this.tone(164, t + 0.02, 0.5, 'sine', 0.04, bus, 700, 0.02, 240);
        this.tone(110, t + 0.12, 0.65, 'triangle', 0.03, bus, 500);
        this.noise(t, 0.35, 0.03, bus, 'bandpass', 900, 420);
        break;
      case 'hyperspace':
        this.noise(t, 0.95, 0.075, bus, 'highpass', 380, 3600);
        this.tone(58, t, 0.9, 'sine', 0.11, bus, 300, 0.02, 24);
        this.tone(116, t + 0.1, 0.7, 'sawtooth', 0.03, bus, 800, 0.02, 38);
        this.noise(t + 0.55, 0.35, 0.04, bus, 'lowpass', 900, 120);
        break;
      case 'klaxon':
        [0, 0.18, 0.36, 0.54].forEach((offset, i) => {
          this.tone(i % 2 === 0 ? 470 : 350, t + offset, 0.14, 'square', 0.045, bus, 2400, 0.01, i % 2 === 0 ? 430 : 320);
        });
        break;
      case 'droid':
        [880, 1320, 760, 1760].forEach((f, i) => {
          this.tone(f, t + i * 0.055, 0.05, 'sine', 0.035, bus, 6000, 0.001, f * 1.15);
        });
        this.noise(t + 0.02, 0.08, 0.015, bus, 'highpass', 3200);
        break;
      case 'tie':
        this.tone(920, t, 0.48, 'sawtooth', 0.06, bus, 3200, 0.01, 150);
        this.tone(1380, t, 0.42, 'square', 0.03, bus, 4200, 0.01, 240);
        this.noise(t, 0.4, 0.04, bus, 'bandpass', 1500, 500);
        break;
      case 'xwing':
        this.tone(190, t, 0.55, 'sawtooth', 0.05, bus, 1300, 0.01, 430);
        this.tone(380, t + 0.04, 0.45, 'triangle', 0.03, bus, 2200, 0.01, 860);
        this.noise(t, 0.48, 0.04, bus, 'bandpass', 900, 2200);
        break;
      case 'force':
        this.tone(54, t, 0.9, 'sine', 0.12, bus, 300, 0.02, 36);
        [108, 162, 216].forEach((f, i) => this.tone(f, t + i * 0.03, 0.75, 'sine', 0.04, bus, 900, 0.02));
        this.noise(t, 0.6, 0.04, bus, 'lowpass', 500, 110);
        break;
      case 'ion':
        this.tone(180, t, 0.35, 'sawtooth', 0.045, bus, 3200, 0.02, 1400);
        this.tone(900, t + 0.18, 0.22, 'sine', 0.04, bus, 7000, 0.001, 2400);
        this.noise(t, 0.25, 0.03, bus, 'highpass', 2200);
        break;
    }
  }

  private gunshot(kind: keyof typeof GUN_PROFILES, dest: AudioNode): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const profile = GUN_PROFILES[kind];
    const t = ctx.currentTime;

    // Crack, body, sub-thump, mechanical action and a room tail.
    this.noise(t, 0.032, profile.crack, dest, 'highpass', profile.crackFreq);
    this.noise(t, profile.bodyDur, profile.bodyGain, dest, 'lowpass', profile.bodyFreq, profile.bodyEnd);
    this.tone(profile.thumpFreq, t, profile.thumpDur, 'sine', profile.thumpGain, dest, 650, 0.002, profile.thumpEnd);
    this.tone(profile.thumpFreq * 0.5, t + 0.008, profile.thumpDur * 1.15, 'triangle', profile.thumpGain * 0.45, dest, 380, 0.002, 28);
    this.noise(t + 0.012, profile.tailDur, profile.tailGain, dest, 'lowpass', 1100, 110);
    this.noise(t + 0.045, 0.022, 0.024, dest, 'bandpass', 2700);
    this.tone(3200, t + 0.055, 0.04, 'triangle', 0.014, dest, 9000, 0.001, 2600);
    if (profile.electric) {
      this.tone(1800, t, 0.12, 'sawtooth', 0.04, dest, 7000, 0.001, 160);
    }
  }

  private voiceBus(pan: number, volume: number, wetAmount = 0.18): AudioNode | null {
    const ctx = this.ctx;
    const sfxBus = this.sfxBus;
    if (!ctx || !sfxBus) return null;
    const output = ctx.createGain();
    output.gain.value = volume;
    output.connect(sfxBus);
    let bus: AudioNode = output;
    if (pan !== 0 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      panner.connect(output);
      bus = panner;
      window.setTimeout(() => {
        try {
          panner.disconnect();
        } catch {
          /* noop */
        }
      }, 2600);
    }
    if (this.reverbInput && wetAmount > 0) {
      const wet = ctx.createGain();
      wet.gain.value = wetAmount;
      output.connect(wet);
      wet.connect(this.reverbInput);
      window.setTimeout(() => {
        try {
          wet.disconnect();
        } catch {
          /* noop */
        }
      }, 2600);
    }
    window.setTimeout(() => {
      try {
        output.disconnect();
      } catch {
        /* noop */
      }
    }, 2800);
    return bus;
  }

  /** Unique synthesized voice for each enemy family. */
  playEnemyVoice(kind: string, action: 'spawn' | 'attack' | 'death', options?: { pan?: number; volume?: number }): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime;
    const pan = Math.max(-1, Math.min(1, options?.pan ?? 0));
    const base = Math.max(0, Math.min(1, options?.volume ?? 1));
    const level = base * (action === 'death' ? 1 : action === 'attack' ? 0.72 : 0.45);
    const bus = this.voiceBus(pan, level, action === 'death' ? 0.26 : 0.12);
    if (!bus) return;

    switch (kind) {
      case 'drone':
        this.tone(1150, t, 0.18, 'triangle', 0.07, bus, 5000, 0.001, action === 'death' ? 120 : 1650);
        this.tone(2300, t + 0.01, 0.12, 'sine', 0.025, bus, 7000, 0.001, action === 'death' ? 220 : 2600);
        this.noise(t, action === 'death' ? 0.3 : 0.1, 0.035, bus, 'bandpass', 1800, 900);
        break;
      case 'ufo':
        this.tone(240, t, 0.32, 'triangle', 0.07, bus, 1200, 0.001, action === 'death' ? 60 : 180);
        this.tone(480, t + 0.02, 0.25, 'sine', 0.03, bus, 2200, 0.001, 110);
        break;
      case 'zombie':
        this.tone(105, t, 0.42, 'sawtooth', 0.08, bus, 600, 0.01, 72);
        this.noise(t, 0.3, 0.045, bus, 'lowpass', 900, 220);
        break;
      case 'brute':
        this.tone(70, t, 0.5, 'sawtooth', 0.12, bus, 450, 0.01, 44);
        this.noise(t, 0.36, 0.06, bus, 'lowpass', 600, 140);
        break;
      case 'alien':
        this.tone(920, t, 0.07, 'sine', 0.05, bus, 6000, 0.001, 1480);
        this.tone(1240, t + 0.08, 0.06, 'sine', 0.035, bus, 7000, 0.001, 1800);
        this.noise(t + 0.02, 0.05, 0.02, bus, 'highpass', 3000);
        break;
      case 'raptor':
        this.tone(1500, t, 0.24, 'sawtooth', 0.075, bus, 6000, 0.001, 420);
        this.tone(2100, t + 0.03, 0.18, 'triangle', 0.035, bus, 9000, 0.001, 600);
        break;
      case 'imp':
        this.tone(760, t, 0.05, 'square', 0.05, bus, 3000);
        this.tone(980, t + 0.07, 0.05, 'square', 0.04, bus, 3000);
        this.tone(720, t + 0.14, 0.06, 'square', 0.035, bus, 3000);
        break;
      case 'voidling':
        this.noise(t, 0.35, 0.035, bus, 'highpass', 2200, 400);
        this.tone(160, t, 0.38, 'sine', 0.045, bus, 700, 0.02, 90);
        break;
      case 'demon':
        this.tone(140, t, 0.45, 'sawtooth', 0.09, bus, 700, 0.01, 58);
        this.noise(t, 0.34, 0.05, bus, 'bandpass', 600, 180);
        break;
      case 'mech':
        this.tone(320, t, 0.1, 'square', 0.04, bus, 1600, 0.001, 420);
        this.noise(t, 0.08, 0.04, bus, 'bandpass', 1800, 900);
        this.tone(180, t + 0.12, 0.16, 'sawtooth', 0.03, bus, 900, 0.01, 240);
        break;
      case 'gingerbread':
        this.tone(1040, t, 0.1, 'sine', 0.06, bus, 6000, 0.001, 1320);
        this.tone(1560, t + 0.09, 0.11, 'sine', 0.045, bus, 7000, 0.001, 1180);
        this.noise(t + 0.02, 0.12, 0.035, bus, 'bandpass', 3400, 1800);
        this.tone(300, t + 0.04, 0.1, 'triangle', 0.03, bus, 900, 0.001, 180);
        break;
      case 'spire':
        this.tone(380, t, 0.35, 'sawtooth', 0.075, bus, 2200, 0.01, 980);
        this.tone(980, t + 0.35, 0.42, 'sawtooth', 0.06, bus, 2600, 0.01, 300);
        this.noise(t + 0.4, 0.3, 0.035, bus, 'bandpass', 1200, 400);
        break;
      case 'banshee':
        this.tone(1150, t, 0.3, 'sine', 0.055, bus, 6000, 0.02, 1750);
        this.tone(1720, t + 0.25, 0.45, 'sine', 0.04, bus, 7000, 0.02, 900);
        this.noise(t, 0.45, 0.02, bus, 'highpass', 2600, 900);
        break;
      case 'scarecrow':
        this.noise(t, 0.16, 0.05, bus, 'bandpass', 900, 2200);
        this.tone(240, t, 0.12, 'sawtooth', 0.05, bus, 1200, 0.01, 170);
        this.tone(680, t + 0.13, 0.18, 'triangle', 0.035, bus, 2400, 0.01, 980);
        break;
      case 'mummy':
        this.noise(t, 0.4, 0.045, bus, 'lowpass', 1100, 280);
        this.tone(118, t, 0.38, 'sawtooth', 0.055, bus, 500, 0.02, 82);
        break;
      case 'pumpkin':
        this.noise(t, 0.22, 0.055, bus, 'bandpass', 800, 2600);
        this.tone(160, t + 0.02, 0.2, 'triangle', 0.05, bus, 900, 0.01, 110);
        this.tone(520, t + 0.1, 0.14, 'sine', 0.025, bus, 2200, 0.01, 700);
        break;
      case 'wendigo':
        this.tone(1650, t, 0.28, 'sawtooth', 0.07, bus, 6000, 0.01, 480);
        this.tone(820, t + 0.05, 0.35, 'square', 0.035, bus, 3800, 0.01, 210);
        this.noise(t, 0.32, 0.04, bus, 'highpass', 1800, 700);
        break;
      case 'helicopter':
        this.tone(74, t, 0.18, 'sawtooth', 0.1, bus, 400, 0.01, 55);
        this.tone(74, t + 0.22, 0.18, 'sawtooth', 0.08, bus, 400, 0.01, 52);
        this.tone(74, t + 0.44, 0.2, 'sawtooth', 0.07, bus, 400, 0.01, 50);
        this.noise(t, 0.62, 0.045, bus, 'bandpass', 420, 180);
        break;
      case 'jet':
        this.tone(920, t, 0.42, 'sawtooth', 0.06, bus, 3200, 0.01, 150);
        this.tone(1380, t, 0.36, 'square', 0.028, bus, 4200, 0.01, 240);
        this.noise(t, 0.45, 0.07, bus, 'highpass', 700, 3200);
        this.tone(220, t, 0.55, 'sawtooth', 0.04, bus, 2400, 0.01, 620);
        break;
      case 'striker':
        this.tone(190, t, 0.5, 'sawtooth', 0.05, bus, 1300, 0.01, 430);
        this.tone(380, t + 0.04, 0.4, 'triangle', 0.03, bus, 2200, 0.01, 860);
        this.tone(1040, t + 0.06, 0.35, 'sine', 0.035, bus, 6000, 0.01, 1560);
        this.noise(t, 0.38, 0.04, bus, 'bandpass', 1800, 2200);
        break;
      case 'omen':
        this.tone(52, t, 0.9, 'sawtooth', 0.16, bus, 320, 0.02, 30);
        [110, 165, 220].forEach((f, i) => this.tone(f, t + i * 0.04, 0.7, 'sine', 0.055, bus, 900));
        this.noise(t, 0.6, 0.05, bus, 'lowpass', 500, 100);
        break;
      case 'phantom':
        this.noise(t, 0.45, 0.03, bus, 'highpass', 2200, 600);
        this.tone(980, t, 0.4, 'sine', 0.04, bus, 5000, 0.03, 420);
        break;
      case 'hexer':
        [660, 880, 1100].forEach((f, i) => this.tone(f, t + i * 0.09, 0.3, 'triangle', 0.04, bus, 5000));
        this.noise(t, 0.3, 0.02, bus, 'highpass', 3000);
        break;
      case 'yeti':
        this.tone(68, t, 0.6, 'sawtooth', 0.14, bus, 500, 0.01, 38);
        this.noise(t, 0.5, 0.07, bus, 'lowpass', 700, 150);
        this.tone(190, t + 0.12, 0.25, 'square', 0.04, bus, 900, 0.01, 90);
        break;
      case 'rex':
        this.tone(74, t, 0.78, 'sawtooth', 0.2, bus, 360, 0.01, 32);
        this.tone(44, t + 0.04, 0.65, 'triangle', 0.12, bus, 240, 0.01, 24);
        this.noise(t, 0.6, 0.07, bus, 'lowpass', 620, 110);
        this.tone(190, t + 0.18, 0.26, 'square', 0.05, bus, 900, 0.01, 80);
        break;
      case 'brood':
        [118, 156, 205].forEach((f, i) => this.tone(f, t + i * 0.04, 0.5, 'sawtooth', 0.07, bus, 700, 0.01, f * 0.55));
        this.noise(t, 0.4, 0.05, bus, 'bandpass', 900, 250);
        break;
      case 'jailer':
        [82, 123, 164].forEach((f, i) => this.tone(f, t + i * 0.02, 0.9, 'sine', 0.1, bus, 800));
        this.noise(t, 0.5, 0.03, bus, 'lowpass', 500, 120);
        break;
      case 'rainmaker':
        this.tone(120, t, 0.18, 'square', 0.1, bus, 900, 0.001, 70);
        this.tone(120, t + 0.22, 0.2, 'square', 0.09, bus, 900, 0.001, 60);
        this.noise(t + 0.04, 0.28, 0.05, bus, 'lowpass', 800, 180);
        break;
      case 'aureole':
        [440, 554, 659].forEach((f, i) => this.tone(f, t + i * 0.05, 0.85, 'sine', 0.045, bus, 5000));
        this.tone(220, t, 0.7, 'triangle', 0.04, bus, 1200);
        break;
      case 'mirrored':
        this.tone(320, t, 0.28, 'square', 0.045, bus, 2200, 0.001, 240);
        this.tone(338, t + 0.12, 0.28, 'square', 0.04, bus, 2200, 0.001, 250);
        break;
      case 'umbra':
        this.noise(t, 0.5, 0.04, bus, 'highpass', 2400, 600);
        this.tone(90, t, 0.6, 'sine', 0.07, bus, 500, 0.02, 44);
        break;
      case 'collector':
        [1200, 1600, 980, 2100].forEach((f, i) => this.tone(f, t + i * 0.055, 0.05, 'square', 0.03, bus, 6000));
        this.tone(150, t, 0.3, 'triangle', 0.05, bus, 700, 0.01, 90);
        break;
      case 'titan':
        this.tone(62, t, 0.55, 'square', 0.14, bus, 500, 0.01, 36);
        this.tone(620, t + 0.05, 0.1, 'square', 0.03, bus, 2200, 0.001, 190);
        this.noise(t + 0.1, 0.3, 0.045, bus, 'bandpass', 1100, 300);
        break;
      case 'warlord':
        this.tone(98, t, 0.7, 'sawtooth', 0.14, bus, 600, 0.01, 49);
        this.tone(147, t + 0.03, 0.55, 'square', 0.05, bus, 900, 0.01, 74);
        this.noise(t, 0.4, 0.04, bus, 'bandpass', 700, 200);
        break;
      case 'jester':
        [988, 1319, 1568, 2093].forEach((f, i) => this.tone(f, t + i * 0.06, 0.08, 'square', 0.035, bus, 7000));
        this.noise(t + 0.02, 0.12, 0.02, bus, 'highpass', 4000);
        break;
      default:
        this.tone(600, t, 0.12, 'triangle', 0.04, bus, 2500, 0.001, 300);
        break;
    }
  }

  setDroneHum(level: number, pan = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.droneHumGain) return;
    this.droneHumGain.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * 0.06, ctx.currentTime, 0.2);
    this.droneHumPanner?.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime, 0.16);
  }

  private startDroneHum(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.droneHumGain) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master);
    let dest: AudioNode = gain;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.connect(gain);
      this.droneHumPanner = panner;
      dest = panner;
    }

    const low = ctx.createOscillator();
    low.type = 'triangle';
    low.frequency.value = 92;
    const lowGain = ctx.createGain();
    lowGain.gain.value = 0.55;
    low.connect(lowGain);
    lowGain.connect(dest);
    low.start();

    const high = ctx.createOscillator();
    high.type = 'sine';
    high.frequency.value = 184;
    const highGain = ctx.createGain();
    highGain.gain.value = 0.22;
    high.connect(highGain);
    highGain.connect(dest);
    high.start();

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 760;
    filter.Q.value = 1.4;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.08;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start();

    this.droneHumGain = gain;
    this.droneHumSources = [low, high, noise];
  }

  startAmbience(): void {
    const ctx = this.ctx;
    if (!ctx || this.ambienceGain || !this.master || !this.noiseBuffer) return;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master);

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    noise.connect(filter);
    filter.connect(gain);
    noise.start();

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 48;
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.22;
    osc.connect(oscGain);
    oscGain.connect(gain);
    osc.start();

    gain.gain.setTargetAtTime(0.042, ctx.currentTime, 0.8);
    this.ambienceGain = gain;
    this.ambienceNoise = noise;
    this.ambienceOsc = osc;
    this.startDroneHum();
  }

  stopAmbience(): void {
    const ctx = this.ctx;
    const gain = this.ambienceGain;
    if (!ctx || !gain) return;
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    const noise = this.ambienceNoise;
    const osc = this.ambienceOsc;
    this.ambienceGain = null;
    this.ambienceNoise = null;
    this.ambienceOsc = null;
    const humGain = this.droneHumGain;
    const humSources = this.droneHumSources;
    this.droneHumGain = null;
    this.droneHumPanner = null;
    this.droneHumSources = [];
    if (humGain) humGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    window.setTimeout(() => {
      for (const source of humSources) {
        try {
          source.stop();
          source.disconnect();
        } catch {
          /* noop */
        }
      }
      try {
        humGain?.disconnect();
      } catch {
        /* noop */
      }
    }, 700);
    window.setTimeout(() => {
      try {
        noise?.stop();
        osc?.stop();
        noise?.disconnect();
        osc?.disconnect();
        gain.disconnect();
      } catch {
        /* already stopped */
      }
    }, 900);
  }

  private tone(
    freq: number,
    time: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    dest: AudioNode | null,
    filterFreq = 8000,
    attack = 0.005,
    endFreq?: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !dest) return;

    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), time + dur);
    }

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(18000, filterFreq), time);
    filter.Q.value = 0.7;

    const peak = Math.max(0.0001, gain);
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.linearRampToValueAtTime(peak, time + Math.min(attack, dur * 0.4));
    amp.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    filter.connect(amp);
    amp.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      amp.disconnect();
    };
  }

  private noise(
    time: number,
    dur: number,
    gain: number,
    dest: AudioNode | null,
    filterType: BiquadFilterType = 'lowpass',
    freq = 2000,
    endFreq?: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !dest || !this.noiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();

    filter.type = filterType;
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(freq, time);
    if (endFreq !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), time + dur);
    }

    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.linearRampToValueAtTime(gain, time + 0.004);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    src.connect(filter);
    filter.connect(amp);
    amp.connect(dest);
    src.start(time);
    src.stop(time + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      amp.disconnect();
    };
  }
}
