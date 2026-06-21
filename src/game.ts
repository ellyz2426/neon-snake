import {
	Mesh,
	Group,
	BoxGeometry,
	SphereGeometry,
	MeshStandardMaterial,
	Vector3,
	Color,
	PointLight,
} from '@iwsdk/core';
import type { World } from '@iwsdk/core';
import {
	Direction,
	GameState,
	GameMode,
	Difficulty,
	SnakeSkin,
	ArenaTheme,
	DIFFICULTY_SPEEDS,
	GRID_SIZE,
	CELL_SIZE,
	SNAKE_SKIN_DEFS,
	SeededRNG,
	type GridPos,
	type GameConfig,
	type SnakeSkinDef,
} from './types';
import { gridToWorld } from './arena';
import type { ArenaRefs } from './arena';
import { AudioManager } from './audio';
import { AchievementManager, type GameStats } from './achievements';
import { ParticleSystem } from './particles';
import { StatsTracker } from './stats';
import { PowerUpManager, PowerUpType } from './powerups';
import { TrailSystem } from './trail';
import { LeaderboardManager } from './leaderboard';

// Maze layouts
const MAZE_LAYOUTS: GridPos[][] = [
	...(() => {
		const obs: GridPos[] = [];
		const mid = Math.floor(GRID_SIZE / 2);
		for (let i = 4; i < GRID_SIZE - 4; i++) {
			if (Math.abs(i - mid) > 1) {
				obs.push({ x: mid, z: i });
				obs.push({ x: i, z: mid });
			}
		}
		return [obs];
	})(),
	...(() => {
		const obs: GridPos[] = [];
		const q1 = Math.floor(GRID_SIZE / 4);
		const q3 = Math.floor((3 * GRID_SIZE) / 4);
		for (const bx of [q1, q3]) {
			for (const bz of [q1, q3]) {
				for (let dx = -1; dx <= 1; dx++) {
					for (let dz = -1; dz <= 1; dz++) {
						obs.push({ x: bx + dx, z: bz + dz });
					}
				}
			}
		}
		return [obs];
	})(),
	...(() => {
		const obs: GridPos[] = [];
		const mid = Math.floor(GRID_SIZE / 2);
		const r = 5;
		for (let x = 0; x < GRID_SIZE; x++) {
			for (let z = 0; z < GRID_SIZE; z++) {
				const d = Math.abs(x - mid) + Math.abs(z - mid);
				if (d === r || d === r + 1) {
					if (x === mid || z === mid) continue;
					obs.push({ x, z });
				}
			}
		}
		return [obs];
	})(),
	...(() => {
		const obs: GridPos[] = [];
		for (let x = 3; x < GRID_SIZE - 3; x++) {
			if (x % 4 === 3) {
				for (let z = 2; z < GRID_SIZE - 2; z++) {
					if (z < GRID_SIZE / 2 - 2 || z > GRID_SIZE / 2 + 1) {
						obs.push({ x, z });
					}
				}
			}
		}
		return [obs];
	})(),
	...(() => {
		const obs: GridPos[] = [];
		for (let x = 3; x <= 12; x++) obs.push({ x, z: 3 });
		for (let z = 3; z <= 10; z++) obs.push({ x: 12, z });
		for (let x = 5; x <= 12; x++) obs.push({ x, z: 10 });
		for (let z = 5; z <= 10; z++) obs.push({ x: 5, z });
		for (let x = 7; x <= 10; x++) obs.push({ x, z: 5 });
		for (let z = 5; z <= 8; z++) obs.push({ x: 10, z });
		return [obs];
	})(),
	...(() => {
		const obs: GridPos[] = [];
		for (let x = 2; x < GRID_SIZE - 2; x += 4) {
			for (let z = 2; z < GRID_SIZE - 2; z += 4) {
				obs.push({ x, z });
				obs.push({ x: x + 1, z });
				obs.push({ x, z: z + 1 });
			}
		}
		return [obs];
	})(),
	// Layout 7: zigzag
	...(() => {
		const obs: GridPos[] = [];
		for (let z = 2; z < GRID_SIZE - 2; z += 3) {
			const startX = z % 6 < 3 ? 2 : GRID_SIZE - 6;
			for (let x = startX; x < startX + 4; x++) {
				obs.push({ x, z });
			}
		}
		return [obs];
	})(),
	// Layout 8: frame
	...(() => {
		const obs: GridPos[] = [];
		for (let i = 4; i <= 11; i++) {
			obs.push({ x: 4, z: i });
			obs.push({ x: 11, z: i });
			obs.push({ x: i, z: 4 });
			obs.push({ x: i, z: 11 });
		}
		// Remove midpoints for passages
		return [obs.filter(o => !(o.x === 4 && o.z === 8) && !(o.x === 11 && o.z === 8) && !(o.x === 8 && o.z === 4) && !(o.x === 8 && o.z === 11))];
	})(),
];

const FOOD_COLORS = [0xff2266, 0xff4488, 0xffaa00, 0x00ccff, 0xaa44ff];

export class GameManager {
	private world: World;
	private arenaGroup: Group;
	private arenaRefs: ArenaRefs;
	private snakeGroup: Group;
	private foodGroup: Group;
	private obstacleGroup: Group;

	private snake: GridPos[] = [];
	private direction: Direction = Direction.Up;
	private nextDirection: Direction = Direction.Up;
	private food: GridPos = { x: 0, z: 0 };
	private obstacles: GridPos[] = [];

	private moveTimer = 0;
	private moveInterval = 0.22;
	private score = 0;
	private highScore = 0;
	private totalFoodEaten = 0;
	private gamesPlayed = 0;

	private state: GameState = GameState.Menu;
	private config: GameConfig = {
		gridSize: GRID_SIZE,
		mode: GameMode.Classic,
		difficulty: Difficulty.Normal,
		skin: SnakeSkin.NeonGreen,
		theme: ArenaTheme.Neon,
	};

	private snakeMeshes: Mesh[] = [];
	private foodMesh: Mesh | null = null;
	private foodLight: PointLight | null = null;
	private obstacleMeshes: Mesh[] = [];

	private animTime = 0;
	private comboCount = 0;
	private comboTimer = 0;
	private maxCombo = 0;
	private sessionTime = 0;
	private deathByWall = false;
	private deathBySelf = false;
	private deathByObstacle = false;
	private powerUpsCollectedThisGame = 0;

	// Subsystems
	readonly audio: AudioManager;
	readonly achievements: AchievementManager;
	readonly particles: ParticleSystem;
	readonly statsTracker: StatsTracker;
	readonly powerUps: PowerUpManager;
	readonly trail: TrailSystem;
	readonly leaderboard: LeaderboardManager;

	private moveCount = 0;
	private turnCount = 0;
	private level = 1;
	private foodSinceLevel = 0;
	private readonly foodPerLevel = 8;

	// Screen shake
	private shakeIntensity = 0;
	private shakeDecay = 8;
	private originalCamPos: Vector3 | null = null;

	// Daily challenge
	private dailyBestScore = 0;
	private dailyDate = '';

	// Time Attack
	private timeAttackRemaining = 0;
	private timeAttackDuration = 60; // seconds
	private timeAttackBest = 0;

	// Active skin
	private currentSkinDef: SnakeSkinDef = SNAKE_SKIN_DEFS[0];

	// Arena reactivity
	private gridPulseIntensity = 0;

	// Callbacks
	onScoreChange?: (score: number, highScore: number, length: number) => void;
	onStateChange?: (state: GameState, score?: number) => void;
	onCombo?: (count: number) => void;
	onAchievement?: (title: string, desc: string) => void;
	onPowerUp?: (label: string) => void;
	onLevelUp?: (level: number) => void;
	onPowerUpActive?: (types: string[]) => void;
	onTimerUpdate?: (remaining: number) => void;
	onTimeUp?: () => void;

	constructor(world: World, arenaRefs: ArenaRefs) {
		this.world = world;
		this.arenaRefs = arenaRefs;
		this.arenaGroup = arenaRefs.group;

		this.snakeGroup = new Group();
		this.foodGroup = new Group();
		this.obstacleGroup = new Group();
		this.arenaGroup.add(this.snakeGroup);
		this.arenaGroup.add(this.foodGroup);
		this.arenaGroup.add(this.obstacleGroup);

		this.audio = new AudioManager();
		this.achievements = new AchievementManager();
		this.particles = new ParticleSystem(this.arenaGroup);
		this.statsTracker = new StatsTracker();
		this.powerUps = new PowerUpManager(this.arenaGroup);
		this.trail = new TrailSystem(this.arenaGroup);
		this.leaderboard = new LeaderboardManager();

		this.powerUps.onCollect = (type, label) => {
			this.audio.playPowerUp();
			this.onPowerUp?.(label);
			this.powerUpsCollectedThisGame++;

			if (type === PowerUpType.Shrink && this.snake.length > 3) {
				const removeCount = Math.min(3, this.snake.length - 3);
				for (let i = 0; i < removeCount; i++) {
					this.snake.pop();
				}
				this.rebuildSnake();
			}
		};

		this.powerUps.onExpire = (_type) => {
			this.audio.playMenuSelect();
		};

		const initAudio = () => this.audio.init();
		document.addEventListener('click', initAudio, { once: true });
		document.addEventListener('touchstart', initAudio, { once: true });

		try {
			const saved = localStorage.getItem('neon-snake-highscore');
			if (saved) this.highScore = parseInt(saved, 10) || 0;
			const dailyRaw = localStorage.getItem('neon-snake-daily');
			if (dailyRaw) {
				const dd = JSON.parse(dailyRaw);
				this.dailyBestScore = dd.score || 0;
				this.dailyDate = dd.date || '';
			}
			const skinRaw = localStorage.getItem('neon-snake-skin');
			if (skinRaw) {
				const skinDef = SNAKE_SKIN_DEFS.find(s => s.id === skinRaw);
				if (skinDef) {
					this.currentSkinDef = skinDef;
					this.config.skin = skinDef.id;
				}
			}
			const themeRaw = localStorage.getItem('neon-snake-theme');
			if (themeRaw && Object.values(ArenaTheme).includes(themeRaw as ArenaTheme)) {
				this.config.theme = themeRaw as ArenaTheme;
			}
			const taBest = localStorage.getItem('neon-snake-ta-best');
			if (taBest) this.timeAttackBest = parseInt(taBest, 10) || 0;
		} catch {}

		this.originalCamPos = world.camera.position.clone();
	}

	getState(): GameState { return this.state; }
	getScore(): number { return this.score; }
	getHighScore(): number { return this.highScore; }
	getSnakeLength(): number { return this.snake.length; }
	getMode(): GameMode { return this.config.mode; }
	getDifficulty(): Difficulty { return this.config.difficulty; }
	getGamesPlayed(): number { return this.gamesPlayed; }
	getLevel(): number { return this.level; }
	getSkin(): SnakeSkin { return this.config.skin; }
	getDailyBestScore(): number { return this.dailyBestScore; }
	getComboCount(): number { return this.comboCount; }
	getTimeRemaining(): number { return this.timeAttackRemaining; }
	getTheme(): ArenaTheme { return this.config.theme; }
	getTimeAttackBest(): number { return this.timeAttackBest; }
	getTimeAttackRemaining(): number { return this.timeAttackRemaining; }
	isTimeAttackMode(): boolean { return this.config.mode === GameMode.TimeAttack; }
	getActivePowerUpLabels(): string[] {
		return this.powerUps.getActiveTypes().map(t => {
			switch (t) {
				case PowerUpType.SpeedBoost: return 'SPD';
				case PowerUpType.Invincibility: return 'INV';
				case PowerUpType.ScoreMultiplier: return '2X';
				case PowerUpType.SlowMotion: return 'SLO';
				default: return '';
			}
		}).filter(Boolean);
	}

	setMode(mode: GameMode) { this.config.mode = mode; }
	setDifficulty(diff: Difficulty) { this.config.difficulty = diff; }
	setTheme(theme: ArenaTheme) {
		this.config.theme = theme;
		try { localStorage.setItem('neon-snake-theme', theme); } catch {}
	}

	setSkin(skin: SnakeSkin) {
		const def = SNAKE_SKIN_DEFS.find(s => s.id === skin);
		if (!def) return;
		this.config.skin = skin;
		this.currentSkinDef = def;
		this.trail.setColor(def.trailColor);
		try { localStorage.setItem('neon-snake-skin', skin); } catch {}
		if (this.state === GameState.Playing) {
			this.rebuildSnake();
		}
	}

	startGame() {
		this.score = 0;
		this.comboCount = 0;
		this.comboTimer = 0;
		this.maxCombo = 0;
		this.moveTimer = 0;
		this.sessionTime = 0;
		this.deathByWall = false;
		this.deathBySelf = false;
		this.deathByObstacle = false;
		this.moveCount = 0;
		this.turnCount = 0;
		this.level = 1;
		this.foodSinceLevel = 0;
		this.powerUpsCollectedThisGame = 0;
		this.moveInterval = DIFFICULTY_SPEEDS[this.config.difficulty];

		const mid = Math.floor(GRID_SIZE / 2);
		this.snake = [
			{ x: mid, z: mid },
			{ x: mid, z: mid + 1 },
			{ x: mid, z: mid + 2 },
		];
		this.direction = Direction.Up;
		this.nextDirection = Direction.Up;

		this.obstacles = [];
		if (this.config.mode === GameMode.Maze) {
			const layoutIdx = Math.floor(Math.random() * MAZE_LAYOUTS.length);
			this.obstacles = [...MAZE_LAYOUTS[layoutIdx]];
		} else if (this.config.mode === GameMode.Daily) {
			// Seeded maze for today
			const rng = SeededRNG.fromDate();
			const layoutIdx = rng.nextInt(MAZE_LAYOUTS.length);
			this.obstacles = [...MAZE_LAYOUTS[layoutIdx]];
			// Add some extra random obstacles
			const extraCount = 3 + rng.nextInt(5);
			for (let i = 0; i < extraCount; i++) {
				const ox = 2 + rng.nextInt(GRID_SIZE - 4);
				const oz = 2 + rng.nextInt(GRID_SIZE - 4);
				const isSnake = this.snake.some(s => s.x === ox && s.z === oz);
				const isObs = this.obstacles.some(o => o.x === ox && o.z === oz);
				if (!isSnake && !isObs) {
					this.obstacles.push({ x: ox, z: oz });
				}
			}
			// Daily uses Normal difficulty always
			this.moveInterval = DIFFICULTY_SPEEDS[Difficulty.Normal];
		} else if (this.config.mode === GameMode.TimeAttack) {
			this.timeAttackRemaining = this.timeAttackDuration;
			// Time Attack uses Normal speed with some random obstacles
			this.moveInterval = DIFFICULTY_SPEEDS[Difficulty.Normal];
			const obsCount = 4 + Math.floor(Math.random() * 6);
			for (let i = 0; i < obsCount; i++) {
				const ox = 1 + Math.floor(Math.random() * (GRID_SIZE - 2));
				const oz = 1 + Math.floor(Math.random() * (GRID_SIZE - 2));
				const isSnake = this.snake.some(s => s.x === ox && s.z === oz);
				const isObs = this.obstacles.some(o => o.x === ox && o.z === oz);
				if (!isSnake && !isObs) {
					this.obstacles.push({ x: ox, z: oz });
				}
			}
		}

		this.clearVisuals();
		this.buildObstacles();
		this.spawnFood();
		this.rebuildSnake();
		this.powerUps.clearAll();
		this.trail.clearAll();
		this.trail.setColor(this.currentSkinDef.trailColor);

		this.state = GameState.Playing;
		this.gamesPlayed++;
		this.audio.playStart();
		this.onStateChange?.(this.state);
		this.onScoreChange?.(this.score, this.highScore, this.snake.length);
	}

	setDirection(dir: Direction) {
		const opposite: Record<Direction, Direction> = {
			[Direction.Up]: Direction.Down,
			[Direction.Down]: Direction.Up,
			[Direction.Left]: Direction.Right,
			[Direction.Right]: Direction.Left,
		};
		if (dir !== opposite[this.direction] && dir !== this.nextDirection) {
			this.nextDirection = dir;
			this.turnCount++;
		}
	}

	pause() {
		if (this.state === GameState.Playing) {
			this.state = GameState.Paused;
			this.audio.playPause();
			this.onStateChange?.(this.state);
		}
	}

	resume() {
		if (this.state === GameState.Paused) {
			this.state = GameState.Playing;
			this.audio.playMenuSelect();
			this.onStateChange?.(this.state);
		}
	}

	togglePause() {
		if (this.state === GameState.Playing) this.pause();
		else if (this.state === GameState.Paused) this.resume();
	}

	returnToMenu() {
		this.state = GameState.Menu;
		this.clearVisuals();
		this.powerUps.clearAll();
		this.trail.clearAll();
		this.onStateChange?.(this.state);
	}

	update(delta: number) {
		this.animTime += delta;
		this.particles.update(delta);
		this.achievements.updateTime(delta);
		this.trail.update(delta);

		// Screen shake
		if (this.shakeIntensity > 0) {
			this.shakeIntensity -= this.shakeDecay * delta;
			if (this.shakeIntensity <= 0) {
				this.shakeIntensity = 0;
				if (this.originalCamPos) {
					this.world.camera.position.copy(this.originalCamPos);
				}
			} else if (this.originalCamPos) {
				const sx = (Math.random() - 0.5) * this.shakeIntensity * 0.02;
				const sy = (Math.random() - 0.5) * this.shakeIntensity * 0.01;
				this.world.camera.position.set(
					this.originalCamPos.x + sx,
					this.originalCamPos.y + sy,
					this.originalCamPos.z,
				);
			}
		}

		if (this.state !== GameState.Playing) {
			this.animateIdle(delta);
			return;
		}

		this.sessionTime += delta;
		this.powerUps.update(delta);

		// Time Attack countdown
		if (this.config.mode === GameMode.TimeAttack) {
			this.timeAttackRemaining -= delta;
			this.onTimerUpdate?.(this.timeAttackRemaining);
			if (this.timeAttackRemaining <= 0) {
				this.timeAttackRemaining = 0;
				this.onTimeUp?.();
				this.gameOver();
				return;
			}
		}

		// Arena reactivity — pulse grid during combos
		if (this.comboCount >= 2) {
			this.gridPulseIntensity = Math.min(1.0, this.comboCount * 0.15);
		} else {
			this.gridPulseIntensity = Math.max(0, this.gridPulseIntensity - delta * 2);
		}
		this.updateArenaReactivity(delta);

		// Notify active power-ups for HUD
		const activeLabels = this.getActivePowerUpLabels();
		this.onPowerUpActive?.(activeLabels);

		if (this.powerUps.shouldSpawn()) {
			const pos = this.findFreeCell();
			if (pos) this.powerUps.spawn(pos);
		}

		if (this.comboTimer > 0) {
			this.comboTimer -= delta;
			if (this.comboTimer <= 0) this.comboCount = 0;
		}

		this.moveTimer += delta;

		let interval = this.moveInterval;
		if (this.config.mode === GameMode.Speed) {
			interval = Math.max(0.06, this.moveInterval - this.score * 0.003);
		}
		interval = Math.max(0.06, interval - (this.level - 1) * 0.008);

		if (this.powerUps.isActive(PowerUpType.SpeedBoost)) {
			interval *= 0.6;
		}
		if (this.powerUps.isActive(PowerUpType.SlowMotion)) {
			interval *= 1.6;
		}

		if (this.moveTimer >= interval) {
			this.moveTimer -= interval;
			this.direction = this.nextDirection;
			this.moveSnake();
		}

		this.animateFood(delta);
		this.animateSnake(delta);
	}

	private moveSnake() {
		const head = { ...this.snake[0] };
		this.moveCount++;

		const tail = this.snake[this.snake.length - 1];
		const tailWorld = gridToWorld(tail.x, tail.z);
		this.trail.addSegment(tailWorld.x, tailWorld.z);

		switch (this.direction) {
			case Direction.Up: head.z--; break;
			case Direction.Down: head.z++; break;
			case Direction.Left: head.x--; break;
			case Direction.Right: head.x++; break;
		}

		const wrapMode = this.config.mode === GameMode.Wrap;
		if (wrapMode) {
			if (head.x < 0) head.x = GRID_SIZE - 1;
			else if (head.x >= GRID_SIZE) head.x = 0;
			if (head.z < 0) head.z = GRID_SIZE - 1;
			else if (head.z >= GRID_SIZE) head.z = 0;
		} else {
			if (head.x < 0 || head.x >= GRID_SIZE || head.z < 0 || head.z >= GRID_SIZE) {
				if (!this.powerUps.isActive(PowerUpType.Invincibility)) {
					this.deathByWall = true;
					this.gameOver();
					return;
				}
				head.x = Math.max(0, Math.min(GRID_SIZE - 1, head.x));
				head.z = Math.max(0, Math.min(GRID_SIZE - 1, head.z));
			}
		}

		if (!this.powerUps.isActive(PowerUpType.Invincibility)) {
			for (const seg of this.snake) {
				if (seg.x === head.x && seg.z === head.z) {
					this.deathBySelf = true;
					this.gameOver();
					return;
				}
			}
		}

		if (!this.powerUps.isActive(PowerUpType.Invincibility)) {
			for (const obs of this.obstacles) {
				if (obs.x === head.x && obs.z === head.z) {
					this.deathByObstacle = true;
					this.gameOver();
					return;
				}
			}
		}

		this.snake.unshift(head);
		this.powerUps.checkCollision(head);

		if (head.x === this.food.x && head.z === this.food.z) {
			this.eatFood();
		} else {
			this.snake.pop();
		}

		this.rebuildSnake();
	}

	private eatFood() {
		this.comboCount++;
		this.comboTimer = 3.0;
		if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;
		const comboMultiplier = Math.min(this.comboCount, 5);
		let points = 10 * comboMultiplier;

		if (this.powerUps.isActive(PowerUpType.ScoreMultiplier)) {
			points *= 2;
		}

		this.score += points;
		this.totalFoodEaten++;
		this.foodSinceLevel++;

		if (this.foodSinceLevel >= this.foodPerLevel) {
			this.foodSinceLevel = 0;
			this.level++;
			this.onLevelUp?.(this.level);
			this.audio.playLevelUp();
		}

		this.audio.playEat(this.comboCount);

		const foodPos = gridToWorld(this.food.x, this.food.z);
		this.particles.spawnEatEffect(foodPos, this.currentSkinDef.headColor);

		if (this.comboCount > 1) {
			this.onCombo?.(this.comboCount);
			this.audio.playCombo(this.comboCount);
			this.particles.spawnComboEffect(foodPos, this.comboCount);
		}

		if (this.score > this.highScore) {
			this.highScore = this.score;
			try { localStorage.setItem('neon-snake-highscore', String(this.highScore)); } catch {}
		}

		this.onScoreChange?.(this.score, this.highScore, this.snake.length);
		this.spawnFood();
	}

	private gameOver() {
		this.state = GameState.GameOver;
		this.audio.playDeath();
		this.shakeIntensity = 1.0;

		if (this.snake.length > 0) {
			const headPos = gridToWorld(this.snake[0].x, this.snake[0].z);
			this.particles.spawnDeathEffect(headPos);
		}

		// Daily best score tracking
		if (this.config.mode === GameMode.Daily) {
			const today = new Date().toISOString().slice(0, 10);
			if (this.score > this.dailyBestScore || this.dailyDate !== today) {
				if (this.dailyDate !== today) {
					this.dailyBestScore = this.score;
					this.dailyDate = today;
				} else {
					this.dailyBestScore = Math.max(this.dailyBestScore, this.score);
				}
				try {
					localStorage.setItem('neon-snake-daily', JSON.stringify({ score: this.dailyBestScore, date: this.dailyDate }));
				} catch {}
			}
		}

		// Time Attack best score tracking
		if (this.config.mode === GameMode.TimeAttack && this.score > this.timeAttackBest) {
			this.timeAttackBest = this.score;
			try { localStorage.setItem('neon-snake-ta-best', String(this.timeAttackBest)); } catch {}
		}

		const stats: GameStats = {
			score: this.score,
			highScore: this.highScore,
			snakeLength: this.snake.length,
			totalFoodEaten: this.totalFoodEaten,
			gamesPlayed: this.gamesPlayed,
			maxCombo: this.maxCombo,
			currentCombo: this.comboCount,
			deathByWall: this.deathByWall,
			deathBySelf: this.deathBySelf,
			deathByObstacle: this.deathByObstacle,
			mode: this.config.mode,
			difficulty: this.config.difficulty,
			perfectGame: false,
			speedModeMaxSpeed: 0,
			mazeCompleted: false,
			timePlayed: this.achievements.getTotalTime(),
			level: this.level,
			powerUpsCollected: this.powerUpsCollectedThisGame,
			dailyChallengeScore: this.config.mode === GameMode.Daily ? this.score : 0,
			timeAttackScore: this.config.mode === GameMode.TimeAttack ? this.score : 0,
		};

		const newAchs = this.achievements.check(stats);
		for (const ach of newAchs) {
			this.audio.playAchievement();
			this.onAchievement?.(ach.title, ach.description);
		}

		this.statsTracker.updateAfterGame(
			this.score,
			this.snake.length,
			this.sessionTime,
			this.moveCount,
			this.turnCount,
			this.config.mode,
		);

		this.leaderboard.addScore(
			this.score,
			this.snake.length,
			this.config.mode,
			this.config.difficulty,
		);

		this.powerUps.clearAll();
		this.trail.clearAll();

		this.onStateChange?.(this.state, this.score);
	}

	private findFreeCell(): GridPos | null {
		const occupied = new Set<string>();
		for (const s of this.snake) occupied.add(`${s.x},${s.z}`);
		for (const o of this.obstacles) occupied.add(`${o.x},${o.z}`);
		occupied.add(`${this.food.x},${this.food.z}`);
		for (const p of this.powerUps.getSpawnedPositions()) occupied.add(`${p.x},${p.z}`);

		const free: GridPos[] = [];
		for (let x = 0; x < GRID_SIZE; x++) {
			for (let z = 0; z < GRID_SIZE; z++) {
				if (!occupied.has(`${x},${z}`)) free.push({ x, z });
			}
		}
		if (free.length === 0) return null;
		return free[Math.floor(Math.random() * free.length)];
	}

	private spawnFood() {
		const pos = this.findFreeCell();
		if (!pos) {
			this.state = GameState.GameOver;
			this.onStateChange?.(this.state, this.score);
			return;
		}
		this.food = pos;
		this.buildFood();
	}

	private clearVisuals() {
		while (this.snakeGroup.children.length) this.snakeGroup.remove(this.snakeGroup.children[0]);
		while (this.foodGroup.children.length) this.foodGroup.remove(this.foodGroup.children[0]);
		while (this.obstacleGroup.children.length) this.obstacleGroup.remove(this.obstacleGroup.children[0]);
		this.snakeMeshes = [];
		this.foodMesh = null;
		this.foodLight = null;
		this.obstacleMeshes = [];
	}

	private rebuildSnake() {
		while (this.snakeMeshes.length > this.snake.length) {
			const m = this.snakeMeshes.pop()!;
			this.snakeGroup.remove(m);
		}

		const segSize = CELL_SIZE * 0.85;
		const headSize = CELL_SIZE * 0.9;

		const skin = this.currentSkinDef;
		let headColor = skin.headColor;
		if (this.powerUps.isActive(PowerUpType.Invincibility)) {
			headColor = 0x00ffff;
		} else if (this.powerUps.isActive(PowerUpType.SpeedBoost)) {
			headColor = 0xffaa00;
		} else if (this.powerUps.isActive(PowerUpType.ScoreMultiplier)) {
			headColor = 0xff00ff;
		}

		for (let i = 0; i < this.snake.length; i++) {
			const pos = gridToWorld(this.snake[i].x, this.snake[i].z);
			const isHead = i === 0;
			const size = isHead ? headSize : segSize;

			if (i < this.snakeMeshes.length) {
				this.snakeMeshes[i].position.set(pos.x, size / 2 + 0.002, pos.z);
				if (isHead) {
					const mat = this.snakeMeshes[i].material as MeshStandardMaterial;
					mat.color.set(headColor);
					mat.emissive.set(headColor);
				}
			} else {
				const t = i / Math.max(this.snake.length - 1, 1);
				const colorIdx = Math.floor(t * (skin.bodyColors.length - 1));
				const baseColor = isHead ? headColor : skin.bodyColors[Math.min(colorIdx, skin.bodyColors.length - 1)];

				const mat = new MeshStandardMaterial({
					color: baseColor,
					emissive: baseColor,
					emissiveIntensity: isHead ? 1.5 : 0.8 - t * 0.3,
					roughness: 0.2,
					metalness: 0.8,
				});

				const geo = new BoxGeometry(size, size, size);
				const mesh = new Mesh(geo, mat);
				mesh.position.set(pos.x, size / 2 + 0.002, pos.z);
				this.snakeGroup.add(mesh);
				this.snakeMeshes.push(mesh);
			}
		}
	}

	private buildFood() {
		if (this.foodMesh) {
			this.foodGroup.remove(this.foodMesh);
			this.foodMesh = null;
		}
		if (this.foodLight) {
			this.foodGroup.remove(this.foodLight);
			this.foodLight = null;
		}

		const pos = gridToWorld(this.food.x, this.food.z);
		const color = FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)];
		const radius = CELL_SIZE * 0.35;

		const mat = new MeshStandardMaterial({
			color: color,
			emissive: color,
			emissiveIntensity: 2.0,
			roughness: 0.1,
			metalness: 0.5,
		});
		const geo = new SphereGeometry(radius, 12, 12);
		this.foodMesh = new Mesh(geo, mat);
		this.foodMesh.position.set(pos.x, radius + 0.005, pos.z);
		this.foodGroup.add(this.foodMesh);

		this.foodLight = new PointLight(color, 0.5, 0.6);
		this.foodLight.position.set(pos.x, 0.08, pos.z);
		this.foodGroup.add(this.foodLight);
	}

	private buildObstacles() {
		for (const obs of this.obstacles) {
			const pos = gridToWorld(obs.x, obs.z);
			const size = CELL_SIZE * 0.9;
			const mat = new MeshStandardMaterial({
				color: 0x663399,
				emissive: 0x441177,
				emissiveIntensity: 1.0,
				roughness: 0.3,
				metalness: 0.7,
			});
			const mesh = new Mesh(new BoxGeometry(size, size * 0.6, size), mat);
			mesh.position.set(pos.x, size * 0.3 + 0.002, pos.z);
			this.obstacleGroup.add(mesh);
			this.obstacleMeshes.push(mesh);
		}
	}

	private animateFood(_delta: number) {
		if (!this.foodMesh) return;
		const pulse = Math.sin(this.animTime * 4) * 0.3 + 0.7;
		const scale = 0.8 + pulse * 0.4;
		this.foodMesh.scale.setScalar(scale);
		this.foodMesh.rotation.y = this.animTime * 2;

		const mat = this.foodMesh.material as MeshStandardMaterial;
		mat.emissiveIntensity = 1.5 + pulse;

		if (this.foodLight) {
			this.foodLight.intensity = 0.3 + pulse * 0.4;
		}
	}

	private animateSnake(_delta: number) {
		for (let i = 0; i < this.snakeMeshes.length; i++) {
			const mesh = this.snakeMeshes[i];
			const mat = mesh.material as MeshStandardMaterial;
			const wave = Math.sin(this.animTime * 3 + i * 0.5) * 0.15;
			if (i === 0) {
				mat.emissiveIntensity = 1.2 + wave;
				// Head bobbing
				const bob = Math.sin(this.animTime * 5) * 0.003;
				mesh.position.y += bob;
			} else {
				const t = i / Math.max(this.snakeMeshes.length - 1, 1);
				mat.emissiveIntensity = 0.7 - t * 0.2 + wave;
			}
		}
	}

	private animateIdle(_delta: number) {
		for (const mesh of this.obstacleMeshes) {
			const mat = mesh.material as MeshStandardMaterial;
			mat.emissiveIntensity = 0.6 + Math.sin(this.animTime * 2) * 0.3;
		}
	}

	private updateArenaReactivity(_delta: number) {
		const refs = this.arenaRefs;
		const pulse = this.gridPulseIntensity;

		// Grid lines glow during combos
		if (pulse > 0) {
			const wave = Math.sin(this.animTime * 6) * 0.3 + 0.7;
			const alpha = 0.4 + pulse * 0.4 * wave;
			refs.gridLineMat.opacity = alpha;
			const r = 0x1a / 255 + pulse * (0x00 / 255 - 0x1a / 255) * wave;
			const g = 0x22 / 255 + pulse * (0xff / 255 - 0x22 / 255) * wave * 0.3;
			const b = 0x55 / 255 + pulse * (0x88 / 255 - 0x55 / 255) * wave;
			refs.gridLineMat.color.setRGB(r, g, b);
		} else {
			refs.gridLineMat.opacity = 0.4;
			refs.gridLineMat.color.setRGB(0x1a / 255, 0x22 / 255, 0x55 / 255);
		}

		// Wall glow intensity shifts with power-ups
		const hasPower = this.powerUps.getActiveTypes().length > 0;
		const wallPulse = hasPower ? (Math.sin(this.animTime * 4) * 0.3 + 0.7) : 0;
		refs.wallMat.emissiveIntensity = 2.0 + wallPulse;

		// Board shimmer during Time Attack urgency
		if (this.config.mode === GameMode.TimeAttack && this.timeAttackRemaining < 10) {
			const urgency = 1 - (this.timeAttackRemaining / 10);
			const redShift = urgency * 0.05 * (Math.sin(this.animTime * 8) * 0.5 + 0.5);
			refs.boardMat.emissive.setRGB(redShift, 0, 0);
			refs.boardMat.emissiveIntensity = 1.0;
		} else {
			refs.boardMat.emissive.setRGB(0, 0, 0);
			refs.boardMat.emissiveIntensity = 0;
		}
	}
}
