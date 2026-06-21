// Statistics tracking for Neon Snake VR

export interface SessionStats {
	longestSnake: number;
	fastestDeath: number; // seconds
	longestSurvival: number; // seconds
	totalDistance: number; // cells moved
	totalTurns: number;
	classicBest: number;
	speedBest: number;
	mazeBest: number;
}

export class StatsTracker {
	private stats: SessionStats = {
		longestSnake: 0,
		fastestDeath: Infinity,
		longestSurvival: 0,
		totalDistance: 0,
		totalTurns: 0,
		classicBest: 0,
		speedBest: 0,
		mazeBest: 0,
	};

	constructor() {
		this.load();
	}

	updateAfterGame(score: number, length: number, survivalTime: number, distance: number, turns: number, mode: string) {
		this.stats.longestSnake = Math.max(this.stats.longestSnake, length);
		if (survivalTime > 0) {
			this.stats.fastestDeath = Math.min(this.stats.fastestDeath, survivalTime);
		}
		this.stats.longestSurvival = Math.max(this.stats.longestSurvival, survivalTime);
		this.stats.totalDistance += distance;
		this.stats.totalTurns += turns;

		if (mode === 'classic') this.stats.classicBest = Math.max(this.stats.classicBest, score);
		else if (mode === 'speed') this.stats.speedBest = Math.max(this.stats.speedBest, score);
		else if (mode === 'maze') this.stats.mazeBest = Math.max(this.stats.mazeBest, score);

		this.save();
	}

	getStats(): SessionStats { return { ...this.stats }; }

	private save() {
		try {
			localStorage.setItem('neon-snake-stats', JSON.stringify(this.stats));
		} catch {}
	}

	private load() {
		try {
			const raw = localStorage.getItem('neon-snake-stats');
			if (raw) {
				const saved = JSON.parse(raw);
				Object.assign(this.stats, saved);
			}
		} catch {}
	}
}
