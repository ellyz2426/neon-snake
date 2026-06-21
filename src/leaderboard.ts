// Local leaderboard for Neon Snake VR

export interface LeaderboardEntry {
	score: number;
	length: number;
	mode: string;
	difficulty: string;
	date: string; // ISO string
}

export class LeaderboardManager {
	private entries: LeaderboardEntry[] = [];
	private readonly maxEntries = 10;
	private readonly storageKey = 'neon-snake-leaderboard';

	constructor() {
		this.load();
	}

	addScore(score: number, length: number, mode: string, difficulty: string): boolean {
		const entry: LeaderboardEntry = {
			score,
			length,
			mode,
			difficulty,
			date: new Date().toISOString(),
		};

		// Check if it qualifies
		if (this.entries.length >= this.maxEntries && score <= this.entries[this.entries.length - 1].score) {
			return false;
		}

		this.entries.push(entry);
		this.entries.sort((a, b) => b.score - a.score);
		if (this.entries.length > this.maxEntries) {
			this.entries = this.entries.slice(0, this.maxEntries);
		}
		this.save();
		return true;
	}

	getTop(count: number = 10): LeaderboardEntry[] {
		return this.entries.slice(0, count);
	}

	getRank(score: number): number {
		const rank = this.entries.findIndex(e => score >= e.score);
		return rank === -1 ? this.entries.length + 1 : rank + 1;
	}

	getHighScore(): number {
		return this.entries.length > 0 ? this.entries[0].score : 0;
	}

	private save(): void {
		try {
			localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
		} catch {}
	}

	private load(): void {
		try {
			const raw = localStorage.getItem(this.storageKey);
			if (raw) {
				this.entries = JSON.parse(raw);
				this.entries.sort((a, b) => b.score - a.score);
			}
		} catch {}
	}
}
