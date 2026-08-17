import { createUISFX } from 'uisfx';

const AUDIO_PREFERENCE_KEY = 'voxel-survival-audio-v1';

export class AudioManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.context = null;
    this.master = null;
    this.isUnlocked = false;
    this.ui = createUISFX({
      pack: 'mechanical',
      volume: 0.64,
      preferences: { key: AUDIO_PREFERENCE_KEY }
    });
    this.enabled = this.ui.isEnabled();
    this.handleTrustedInput = this.handleTrustedInput.bind(this);

    window.addEventListener('pointerdown', this.handleTrustedInput, { once: true });
    window.addEventListener('keydown', this.handleTrustedInput, { once: true });
  }

  async handleTrustedInput() {
    await this.unlock();
  }

  async unlock() {
    if (this.isUnlocked) {
      return true;
    }

    try {
      const uiReady = await this.ui.unlock();
      const context = this.getContext();

      if (context?.state === 'suspended') {
        await context.resume();
      }

      this.isUnlocked = Boolean(uiReady || context?.state === 'running');
      return this.isUnlocked;
    } catch {
      this.isUnlocked = false;
      return false;
    }
  }

  play(cue, options) {
    if (!this.enabled) {
      return null;
    }

    try {
      return this.ui.play(cue, options);
    } catch {
      return null;
    }
  }

  playGameEffect(effect) {
    if (!this.enabled) {
      return;
    }

    const recipes = {
      revolver: () => this.playNoiseBurst(0.12, 0.32, 145, 58),
      impact: () => this.playTone(92, 48, 0.09, 0.16, 'square'),
      tower: () => this.playTone(330, 120, 0.11, 0.13, 'square'),
      zombieHit: () => this.playTone(74, 46, 0.13, 0.12, 'sawtooth'),
      playerHit: () => this.playNoiseBurst(0.16, 0.2, 92, 42)
    };

    recipes[effect]?.();
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.ui.setEnabled(this.enabled);
    this.eventBus?.emit('audio:changed', { enabled: this.enabled });

    if (this.enabled) {
      this.play('toggle-on');
    }
  }

  isEnabled() {
    return this.enabled;
  }

  getContext() {
    if (this.context) {
      return this.context;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    this.context = new AudioContextClass({ latencyHint: 'interactive' });
    this.master = this.context.createGain();
    this.master.gain.value = 0.45;
    this.master.connect(this.context.destination);
    return this.context;
  }

  playTone(startFrequency, endFrequency, duration, volume, waveform) {
    const context = this.getContext();

    if (!context || !this.master) {
      return;
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.015);
  }

  playNoiseBurst(duration, volume, startFrequency, endFrequency) {
    const context = this.getContext();

    if (!context || !this.master) {
      return;
    }

    const length = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 9137;

    for (let index = 0; index < length; index += 1) {
      seed = (seed * 16807) % 2147483647;
      data[index] = (seed / 1073741823.5 - 1) * (1 - index / length);
    }

    const now = context.currentTime;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(startFrequency, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
  }

  async dispose() {
    window.removeEventListener('pointerdown', this.handleTrustedInput);
    window.removeEventListener('keydown', this.handleTrustedInput);
    await this.ui.destroy();

    if (this.context) {
      await this.context.close();
      this.context = null;
      this.master = null;
    }
  }
}
