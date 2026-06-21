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
	perfectGame: boolean;
	speedModeMaxSpeed: number;
	mazeCompleted: boolean;
	timePlayed: number; // seconds
	level: number;
	powerUpsCollected: number;
	dailyChallengeScore: number;
}

const ACHIEVEMENT_DEFS: { id: string; title: string; desc: string; icon: string; check: AchievementChecker }[] = [
	// === LENGTH ===
	{ id: 'first-bite', title: 'First Bite', desc: 'Eat your first food', icon: '*', check: s => s.totalFoodEaten >= 1 },
	{ id: 'growing', title: 'Growing Up', desc: 'Reach length 10', icon: '>', check: s => s.snakeLength >= 10 },
	{ id: 'long-snake', title: 'Long Snake', desc: 'Reach length 20', icon: '>>', check: s => s.snakeLength >= 20 },
	{ id: 'mega-snake', title: 'Mega Snake', desc: 'Reach length 35', icon: '>>', check: s => s.snakeLength >= 35 },
	{ id: 'ultra-snake', title: 'Ultra Snake', desc: 'Reach length 50', icon: '>>', check: s => s.snakeLength >= 50 },
	{ id: 'titan-snake', title: 'Titan Snake', desc: 'Reach length 75', icon: '>>', check: s => s.snakeLength >= 75 },
	{ id: 'max-snake', title: 'Maximum Serpent', desc: 'Reach length 100', icon: '>>', check: s => s.snakeLength >= 100 },

	// === SCORE ===
	{ id: 'score-100', title: 'Century', desc: 'Score 100 points', icon: '!', check: s => s.score >= 100 },
	{ id: 'score-500', title: 'High Roller', desc: 'Score 500 points', icon: '!!', check: s => s.score >= 500 },
	{ id: 'score-1000', title: 'Grand Master', desc: 'Score 1000 points', icon: '!!', check: s => s.score >= 1000 },
	{ id: 'score-2000', title: 'Legend', desc: 'Score 2000 points', icon: '!!', check: s => s.score >= 2000 },
	{ id: 'score-5000', title: 'Mythic', desc: 'Score 5000 points', icon: '!!', check: s => s.score >= 5000 },
	{ id: 'score-10000', title: 'Transcendent', desc: 'Score 10000 points', icon: '!!', check: s => s.score >= 10000 },

	// === COMBO ===
	{ id: 'combo-3', title: 'Combo Starter', desc: 'Get a 3x combo', icon: 'x3', check: s => s.maxCombo >= 3 },
	{ id: 'combo-5', title: 'Combo King', desc: 'Get a 5x combo', icon: 'x5', check: s => s.maxCombo >= 5 },
	{ id: 'combo-8', title: 'Combo Legend', desc: 'Get an 8x combo', icon: 'x8', check: s => s.maxCombo >= 8 },
	{ id: 'combo-12', title: 'Combo God', desc: 'Get a 12x combo', icon: 'x+', check: s => s.maxCombo >= 12 },
	{ id: 'combo-20', title: 'Untouchable', desc: 'Get a 20x combo', icon: 'xx', check: s => s.maxCombo >= 20 },

	// === GAMES PLAYED ===
	{ id: 'games-5', title: 'Regular', desc: 'Play 5 games', icon: '#5', check: s => s.gamesPlayed >= 5 },
	{ id: 'games-10', title: 'Dedicated', desc: 'Play 10 games', icon: '#', check: s => s.gamesPlayed >= 10 },
	{ id: 'games-25', title: 'Addicted', desc: 'Play 25 games', icon: '#', check: s => s.gamesPlayed >= 25 },
	{ id: 'games-50', title: 'Obsessed', desc: 'Play 50 games', icon: '#', check: s => s.gamesPlayed >= 50 },
	{ id: 'games-100', title: 'One Hundred', desc: 'Play 100 games', icon: '#', check: s => s.gamesPlayed >= 100 },

	// === FOOD EATEN ===
	{ id: 'food-50', title: 'Hungry', desc: 'Eat 50 total food', icon: 'F', check: s => s.totalFoodEaten >= 50 },
	{ id: 'food-100', title: 'Ravenous', desc: 'Eat 100 total food', icon: 'F', check: s => s.totalFoodEaten >= 100 },
	{ id: 'food-250', title: 'Bottomless', desc: 'Eat 250 total food', icon: 'F', check: s => s.totalFoodEaten >= 250 },
	{ id: 'food-500', title: 'Insatiable', desc: 'Eat 500 total food', icon: 'F', check: s => s.totalFoodEaten >= 500 },
	{ id: 'food-1000', title: 'Devourer', desc: 'Eat 1000 total food', icon: 'F', check: s => s.totalFoodEaten >= 1000 },

	// === DIFFICULTY ===
	{ id: 'easy-win', title: 'Easy Does It', desc: 'Score 200 on Easy', icon: 'E', check: s => s.difficulty === 'easy' && s.score >= 200 },
	{ id: 'normal-win', title: 'Standard Issue', desc: 'Score 200 on Normal', icon: 'N', check: s => s.difficulty === 'normal' && s.score >= 200 },
	{ id: 'hard-win', title: 'Hard Core', desc: 'Score 200 on Hard', icon: 'H', check: s => s.difficulty === 'hard' && s.score >= 200 },
	{ id: 'hard-500', title: 'Hardcore 500', desc: 'Score 500 on Hard', icon: 'H', check: s => s.difficulty === 'hard' && s.score >= 500 },
	{ id: 'hard-1000', title: 'Iron Will', desc: 'Score 1000 on Hard', icon: 'H', check: s => s.difficulty === 'hard' && s.score >= 1000 },

	// === MODE-SPECIFIC ===
	{ id: 'speed-demon', title: 'Speed Demon', desc: 'Score 300 in Speed mode', icon: 'S', check: s => s.mode === 'speed' && s.score >= 300 },
	{ id: 'speed-500', title: 'Velocity', desc: 'Score 500 in Speed mode', icon: 'S', check: s => s.mode === 'speed' && s.score >= 500 },
	{ id: 'maze-runner', title: 'Maze Runner', desc: 'Score 200 in Maze mode', icon: 'M', check: s => s.mode === 'maze' && s.score >= 200 },
	{ id: 'maze-500', title: 'Labyrinthine', desc: 'Score 500 in Maze mode', icon: 'M', check: s => s.mode === 'maze' && s.score >= 500 },
	{ id: 'classic-master', title: 'Classic Master', desc: 'Score 500 in Classic', icon: 'C', check: s => s.mode === 'classic' && s.score >= 500 },
	{ id: 'classic-1k', title: 'Classic Elite', desc: 'Score 1000 in Classic', icon: 'C', check: s => s.mode === 'classic' && s.score >= 1000 },
	{ id: 'wrap-master', title: 'Wrap Master', desc: 'Score 500 in Wrap mode', icon: 'W', check: s => s.mode === 'wrap' && s.score >= 500 },
	{ id: 'daily-200', title: 'Daily Driver', desc: 'Score 200 in Daily Challenge', icon: 'D', check: s => s.mode === 'daily' && s.score >= 200 },
	{ id: 'daily-500', title: 'Daily Expert', desc: 'Score 500 in Daily Challenge', icon: 'D', check: s => s.mode === 'daily' && s.score >= 500 },

	// === DEATH ===
	{ id: 'wall-hugger', title: 'Wall Hugger', desc: 'Die by hitting a wall', icon: 'W', check: s => s.deathByWall },
	{ id: 'ouroboros', title: 'Ouroboros', desc: 'Die by eating yourself', icon: 'O', check: s => s.deathBySelf },
	{ id: 'obstacle-doom', title: 'Roadblock', desc: 'Die by hitting an obstacle', icon: 'X', check: s => s.deathByObstacle },

	// === TIME ===
	{ id: 'time-5', title: 'Five Minutes', desc: 'Play for 5 minutes total', icon: 'T', check: s => s.timePlayed >= 300 },
	{ id: 'time-15', title: 'Quarter Hour', desc: 'Play for 15 minutes', icon: 'T', check: s => s.timePlayed >= 900 },
	{ id: 'time-30', title: 'Half Hour', desc: 'Play for 30 minutes', icon: 'T', check: s => s.timePlayed >= 1800 },
	{ id: 'time-60', title: 'Full Hour', desc: 'Play for 60 minutes', icon: 'T', check: s => s.timePlayed >= 3600 },
	{ id: 'survivor', title: 'Survivor', desc: 'Survive 60 seconds on Hard', icon: 'SV', check: s => s.difficulty === 'hard' && s.timePlayed >= 60 },
	{ id: 'endurance', title: 'Endurance', desc: 'Survive 120 seconds on Hard', icon: 'SV', check: s => s.difficulty === 'hard' && s.timePlayed >= 120 },

	// === LEVELS ===
	{ id: 'level-3', title: 'Level Up', desc: 'Reach level 3', icon: 'L3', check: s => s.level >= 3 },
	{ id: 'level-5', title: 'Rising Star', desc: 'Reach level 5', icon: 'L5', check: s => s.level >= 5 },
	{ id: 'level-10', title: 'Veteran', desc: 'Reach level 10', icon: 'L+', check: s => s.level >= 10 },
	{ id: 'level-15', title: 'Apex', desc: 'Reach level 15', icon: 'L+', check: s => s.level >= 15 },

	// === POWER-UPS ===
	{ id: 'power-1', title: 'Power Player', desc: 'Collect a power-up', icon: 'P', check: s => s.powerUpsCollected >= 1 },
	{ id: 'power-10', title: 'Power Hoard', desc: 'Collect 10 power-ups total', icon: 'P', check: s => s.powerUpsCollected >= 10 },
	{ id: 'power-25', title: 'Power Junkie', desc: 'Collect 25 power-ups total', icon: 'P', check: s => s.powerUpsCollected >= 25 },

	// === SPECIAL ===
	{ id: 'all-modes', title: 'Versatile', desc: 'Score 100 in all 4 modes', icon: 'V', check: () => false }, // Checked separately
	{ id: 'all-diff', title: 'Adaptable', desc: 'Score 200 on all 3 difficulties', icon: 'A', check: () => false }, // Checked separately
	{ id: 'no-power', title: 'Purist', desc: 'Score 300 without power-ups', icon: '~', check: s => s.powerUpsCollected === 0 && s.score >= 300 },
];

export class AchievementManager {
	private achievements: Map<string, Achievement> = new Map();
	private modeBestScores: Record<string, number> = {};
	private diffBestScores: Record<string, number> = {};
	private totalTimePlayed = 0;
	private sessionTimePlayed = 0;
	private totalPowerUpsCollected = 0;
	onUnlock?: (achievement: Achievement) => void;

	constructor() {
		for (const def of ACHIEVEMENT_DEFS) {
			this.achievements.set(def.id, {
				id: def.id,
				title: def.title,
				description: def.desc,
				icon: def.icon,
				unlocked: false,
			});
		}
		this.load();
	}

	check(stats: GameStats): Achievement[] {
		const newlyUnlocked: Achievement[] = [];

		// Track mode and difficulty best scores
		const modeKey = stats.mode;
		this.modeBestScores[modeKey] = Math.max(this.modeBestScores[modeKey] ?? 0, stats.score);
		const diffKey = stats.difficulty;
		this.diffBestScores[diffKey] = Math.max(this.diffBestScores[diffKey] ?? 0, stats.score);
		this.totalPowerUpsCollected += stats.powerUpsCollected;

		for (const def of ACHIEVEMENT_DEFS) {
			const ach = this.achievements.get(def.id)!;
			if (ach.unlocked) continue;

			let earned = false;
			if (def.id === 'all-modes') {
				earned = (this.modeBestScores['classic'] ?? 0) >= 100 &&
				         (this.modeBestScores['speed'] ?? 0) >= 100 &&
				         (this.modeBestScores['maze'] ?? 0) >= 100 &&
				         (this.modeBestScores['wrap'] ?? 0) >= 100;
			} else if (def.id === 'all-diff') {
				earned = (this.diffBestScores['easy'] ?? 0) >= 200 &&
				         (this.diffBestScores['normal'] ?? 0) >= 200 &&
				         (this.diffBestScores['hard'] ?? 0) >= 200;
			} else if (def.id === 'power-10' || def.id === 'power-25') {
				const total = this.totalPowerUpsCollected;
				if (def.id === 'power-10') earned = total >= 10;
				else earned = total >= 25;
			} else {
				earned = def.check(stats);
			}

			if (earned) {
				ach.unlocked = true;
				ach.unlockedAt = Date.now();
				newlyUnlocked.push(ach);
			}
		}

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
				diffBestScores: this.diffBestScores,
				totalTimePlayed: this.totalTimePlayed,
				totalPowerUpsCollected: this.totalPowerUpsCollected,
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
			if (data.diffBestScores) this.diffBestScores = data.diffBestScores;
			if (data.totalTimePlayed) this.totalTimePlayed = data.totalTimePlayed;
			if (data.totalPowerUpsCollected) this.totalPowerUpsCollected = data.totalPowerUpsCollected;
		} catch {}
	}
}
