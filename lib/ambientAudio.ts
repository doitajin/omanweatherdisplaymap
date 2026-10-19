'use client';

// Pure Web Audio API procedural ambient breeze and ocean synthesizer
// Zero external audio files - 100% procedurally synthesized in real time
class AmbientWeatherSynthesizer {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private masterGain: GainNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private lfoGain: GainNode | null = null;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    } catch (e) {
      console.warn('Web Audio not supported:', e);
    }
  }

  public async toggle(): Promise<boolean> {
    if (!this.ctx) {
      this.init();
    }
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public start() {
    if (!this.ctx || this.isPlaying) return;

    try {
      // Create master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      // Smooth fade in over 1.2s to prevent click
      this.masterGain.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 1.2);
      this.masterGain.connect(this.ctx.destination);

      // Generate 5-second seamless pink/brownian noise buffer
      const bufferSize = this.ctx.sampleRate * 5;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      // Resonant Lowpass & Bandpass filter for coastal wind texture
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(380, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(3.0, this.ctx.currentTime);

      // Low Frequency Oscillator (LFO) to create realistic wind swells and ocean surges
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime); // ~5.5-second swell cycle
      
      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.setValueAtTime(140, this.ctx.currentTime); // Modulate cutoff by ±140Hz
      lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.filterNode.frequency);
      lfo.start();

      this.noiseNode.connect(this.filterNode);
      this.filterNode.connect(this.masterGain);

      this.noiseNode.start();
      this.isPlaying = true;
    } catch (e) {
      console.warn('Error starting ambient audio:', e);
    }
  }

  public stop() {
    if (!this.ctx || !this.isPlaying || !this.masterGain) return;
    try {
      // Smooth fade out over 0.8s
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);

      setTimeout(() => {
        try {
          this.noiseNode?.stop();
          this.noiseNode?.disconnect();
          this.filterNode?.disconnect();
          this.masterGain?.disconnect();
          this.noiseNode = null;
          this.filterNode = null;
          this.masterGain = null;
          this.isPlaying = false;
        } catch {
          this.isPlaying = false;
        }
      }, 850);
    } catch {
      this.isPlaying = false;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const ambientSound = new AmbientWeatherSynthesizer();
