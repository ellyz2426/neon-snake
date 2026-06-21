// Procedural audio for Neon Snake VR
// Uses Web Audio API for retro synth sounds

export class AudioManager {
	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private volume = 0.5;
	private muted = false;

	init() {
		if (this.ctx) return;
		try {
			this.ctx = new AudioContext();
			this.masterGain = this.ctx.createGain();
			this.masterGain.gain.value = this.volume;
			this.masterGain.connect(this.ctx.destination);
		} catch {}
	}

	setVolume(v: number) {
		this.volume = Math.max(0, Math.min(1, v));
		if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : this.volume;
	}

	toggleMute(): boolean {
		this.muted = !this.muted;
		if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : this.volume;
		return this.muted;
	}

	isMuted(): boolean { return this.muted; }

	private playTone(freq: number, duration: number, type: OscillatorType = 'square', vol = 0.3) {
		if (!this.ctx || !this.masterGain) return;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = type;
		osc.frequency.value = freq;
		gain.gain.setValueAtTime(vol, this.ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start();
		osc.stop(this.ctx.currentTime + duration);
	}

	playEat(combo: number) {
		if (!this.ctx) this.init();
		// Rising pitch for combos
		const baseFreq = 440 + combo * 80;
		this.playTone(baseFreq, 0.15, 'square', 0.25);
		setTimeout(() => this.playTone(baseFreq * 1.5, 0.1, 'square', 0.2), 50);
	}

	playMove() {
		if (!this.ctx) this.init();
		this.playTone(120, 0.04, 'square', 0.05);
	}

	playDeath() {
		if (!this.ctx) this.init();
		// Descending tones
		const freqs = [440, 330, 220, 110];
		freqs.forEach((f, i) => {
			setTimeout(() => this.playTone(f, 0.2, 'sawtooth', 0.3), i * 100);
		});
	}

	playStart() {
		if (!this.ctx) this.init();
		this.playTone(330, 0.1, 'square', 0.2);
		setTimeout(() => this.playTone(440, 0.1, 'square', 0.2), 100);
		setTimeout(() => this.playTone(660, 0.15, 'square', 0.25), 200);
	}

	playMenuSelect() {
		if (!this.ctx) this.init();
		this.playTone(550, 0.08, 'sine', 0.15);
	}

	playPause() {
		if (!this.ctx) this.init();
		this.playTone(300, 0.15, 'triangle', 0.15);
	}

	playAchievement() {
		if (!this.ctx) this.init();
		const melody = [523, 659, 784, 1047];
		melody.forEach((f, i) => {
			setTimeout(() => this.playTone(f, 0.2, 'sine', 0.2), i * 120);
		});
	}

	playCombo(count: number) {
		if (!this.ctx) this.init();
		const freq = 600 + count * 100;
		this.playTone(freq, 0.1, 'square', 0.2);
		setTimeout(() => this.playTone(freq * 1.25, 0.15, 'square', 0.25), 60);
	}

	playPowerUp() {
		if (!this.ctx) this.init();
		this.playTone(880, 0.08, 'sine', 0.25);
		setTimeout(() => this.playTone(1100, 0.08, 'sine', 0.25), 60);
		setTimeout(() => this.playTone(1320, 0.12, 'sine', 0.3), 120);
	}

	playLevelUp() {
		if (!this.ctx) this.init();
		const notes = [440, 550, 660, 880, 1100];
		notes.forEach((f, i) => {
			setTimeout(() => this.playTone(f, 0.12, 'triangle', 0.2), i * 80);
		});
	}
}
