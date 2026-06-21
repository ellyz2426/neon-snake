// Achievements system for Neon Snake VR

export interface Achievement {
	id: string;
	title: string;
	description: string;
	icon: string; // ASCII icon
	unlocked: boolean;
	unlockedAt?: number;
}

type AchievementChecker = (stats: GameStats) => boolean;

export interface GameStats {
	score: number;
	highScore: number;
	snakeLength: number;
	totalFoodEaten: number;
	gamesPlayed: number;
	maxCombo: number;
	currentCombo: number;
	deathByWall: boolean;
	deathBySelf: boolean;
	deathByObstacle: boolean;
	mode: string;
	difficulty: string;
	perfectGame: boolean; // no direction changes wasted
	speedModeMaxSpeed: number;
	mazeCompleted: boolean;
	timePlayed: number; // seconds
}

const ACHIEVEMENT_DEFS: { id: string; title: string; desc: string; icon: string; check: AchievementChecker }[] = [
	{ id: 'first-bite', title: 'First Bite', desc: 'Eat your first food', icon: '*', check: s => s.totalFoodEaten >= 1 },
	{ id: 'growing', title: 'Growing Up', desc: 'Reach length 10', icon: '>', check: s => s.snakeLength >= 10 },
	{ id: 'long-snake', title: 'Long Snake', desc: 'Reach length 20', icon: '>>', check: s => s.snakeLength >= 20 },
	{ id: 'mega-snake', title: 'Mega Snake', desc: 'Reach length 35', icon: '>>>', check: s => s.snakeLength >= 35 },
	{ id: 'ultra-snake', title: 'Ultra Snake', desc: 'Reach length 50', icon: '>>>>', check: s => s.snakeLength >= 50 },
	{ id: 'score-100', title: 'Century', desc: 'Score 100 points', icon: '!', check: s => s.score >= 100 },
	{ id: 'score-500', title: 'High Roller', desc: 'Score 500 points', icon: '!!', check: s => s.score >= 500 },
	{ id: 'score-1000', title: 'Grand Master', desc: 'Score 1000 points', icon: '!!!', check: s => s.score >= 1000 },
	{ id: 'score-2000', title: 'Legend', desc: 'Score 2000 points', icon: '!!!!', check: s => s.score >= 2000 },
	{ id: 'combo-3', title: 'Combo Starter', desc: 'Get a 3x combo', icon: 'x3', check: s => s.maxCombo >= 3 },
	{ id: 'combo-5', title: 'Combo King', desc: 'Get a 5x combo', icon: 'x5', check: s => s.maxCombo >= 5 },
	{ id: 'combo-8', title: 'Combo Legend', desc: 'Get an 8x combo', icon: 'x8', check: s => s.maxCombo >= 8 },
	{ id: 'games-5', title: 'Regular', desc: 'Play 5 games', icon: '#5', check: s => s.gamesPlayed >= 5 },
	{ id: 'games-10', title: 'Dedicated', desc: 'Play 10 games', icon: '#10', check: s => s.gamesPlayed >= 10 },
	{ id: 'games-25', title: 'Addicted', desc: 'Play 25 games', icon: '#25', check: s => s.gamesPlayed >= 25 },
	{ id: 'food-50', title: 'Hungry', desc: 'Eat 50 total food', icon: 'F50', check: s => s.totalFoodEaten >= 50 },
	{ id: 'food-100', title: 'Ravenous', desc: 'Eat 100 total food', icon: 'F100', check: s => s.totalFoodEaten >= 100 },
	{ id: 'food-250', title: 'Bottomless', desc: 'Eat 250 total food', icon: 'F250', check: s => s.totalFoodEaten >= 250 },
	{ id: 'easy-win', title: 'Easy Does It', desc: 'Score 200 on Easy', icon: 'E', check: s => s.difficulty === 'easy' && s.score >= 200 },
	{ id: 'normal-win', title: 'Standard Issue', desc: 'Score 200 on Normal', icon: 'N', check: s => s.difficulty === 'normal' && s.score >= 200 },
	{ id: 'hard-win', title: 'Hard Core', desc: 'Score 200 on Hard', icon: 'H', check: s => s.difficulty === 'hard' && s.score >= 200 },
	{ id: 'speed-demon', title: 'Speed Demon', desc: 'Score 300 in Speed mode', icon: 'S', check: s => s.mode === 'speed' && s.score >= 300 },
	{ id: 'maze-runner', title: 'Maze Runner', desc: 'Score 200 in Maze mode', icon: 'M', check: s => s.mode === 'maze' && s.score >= 200 },
	{ id: 'classic-master', title: 'Classic Master', desc: 'Score 500 in Classic', icon: 'C', check: s => s.mode === 'classic' && s.score >= 500 },
	{ id: 'wall-hugger', title: 'Wall Hugger', desc: 'Die by hitting a wall', icon: 'W', check: s => s.deathByWall },
	{ id: 'ouroboros', title: 'Ouroboros', desc: 'Die by eating yourself', icon: 'O', check: s => s.deathBySelf },
	{ id: 'time-5', title: 'Five Minutes', desc: 'Play for 5 minutes total', icon: 'T5', check: s => s.timePlayed >= 300 },
	{ id: 'time-15', title: 'Quarter Hour', desc: 'Play for 15 minutes', icon: 'T15', check: s => s.timePlayed >= 900 },
	{ id: 'time-30', title: 'Half Hour', desc: 'Play for 30 minutes', icon: 'T30', check: s => s.timePlayed >= 1800 },
	{ id: 'survivor', title: 'Survivor', desc: 'Survive 60 seconds on Hard', icon: 'SV', check: s => s.difficulty === 'hard' && s.timePlayed >= 60 },
	{ id: 'all-modes', title: 'Versatile', desc: 'Score 100 in all 3 modes', icon: 'V', check: () => false }, // Checked separately
];

export class AchievementManager {
	private achievements: Map<string, Achievement> = new Map();
	private modeBestScores: Record<string, number> = {};
	private totalTimePlayed = 0;
	private sessionTimePlayed = 0;
	onUnlock?: (achievement: Achievement) => void;

	constructor() {
		// Initialize achievements
		for (const def of ACHIEVEMENT_DEFS) {
			this.achievements.set(def.id, {
				id: def.id,
				title: def.title,
				description: def.desc,
				icon: def.icon,
				unlocked: false,
			});
		}

		// Load saved state
		this.load();
	}

	check(stats: GameStats): Achievement[] {
		const newlyUnlocked: Achievement[] = [];

		for (const def of ACHIEVEMENT_DEFS) {
			const ach = this.achievements.get(def.id)!;
			if (ach.unlocked) continue;

			let earned = false;
			if (def.id === 'all-modes') {
				// Special check
				earned = (this.modeBestScores['classic'] ?? 0) >= 100 &&
				         (this.modeBestScores['speed'] ?? 0) >= 100 &&
				         (this.modeBestScores['maze'] ?? 0) >= 100;
			} else {
				earned = def.check(stats);
			}

			if (earned) {
				ach.unlocked = true;
				ach.unlockedAt = Date.now();
				newlyUnlocked.push(ach);
			}
		}

		// Track mode scores
		const modeKey = stats.mode;
		this.modeBestScores[modeKey] = Math.max(this.modeBestScores[modeKey] ?? 0, stats.score);

		if (newlyUnlocked.length > 0) {
			this.save();
		}

		return newlyUnlocked;
	}

	updateTime(delta: number) {
		this.sessionTimePlayed += delta;
		this.totalTimePlayed += delta;
	}

	getTotalTime(): number { return this.totalTimePlayed; }

	getAll(): Achievement[] {
		return Array.from(this.achievements.values());
	}

	getUnlockedCount(): number {
		return Array.from(this.achievements.values()).filter(a => a.unlocked).length;
	}

	getTotalCount(): number {
		return this.achievements.size;
	}

	private save() {
		try {
			const data = {
				achievements: Array.from(this.achievements.entries()).filter(([, a]) => a.unlocked).map(([id, a]) => ({
					id,
					unlockedAt: a.unlockedAt,
				})),
				modeBestScores: this.modeBestScores,
				totalTimePlayed: this.totalTimePlayed,
			};
			localStorage.setItem('neon-snake-achievements', JSON.stringify(data));
		} catch {}
	}

	private load() {
		try {
			const raw = localStorage.getItem('neon-snake-achievements');
			if (!raw) return;
			const data = JSON.parse(raw);
			if (data.achievements) {
				for (const saved of data.achievements) {
					const ach = this.achievements.get(saved.id);
					if (ach) {
						ach.unlocked = true;
						ach.unlockedAt = saved.unlockedAt;
					}
				}
			}
			if (data.modeBestScores) this.modeBestScores = data.modeBestScores;
			if (data.totalTimePlayed) this.totalTimePlayed = data.totalTimePlayed;
		} catch {}
	}
}
