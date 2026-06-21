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
	DIFFICULTY_SPEEDS,
	GRID_SIZE,
	CELL_SIZE,
	type GridPos,
	type GameConfig,
} from './types';
import { gridToWorld } from './arena';
import { AudioManager } from './audio';
import { AchievementManager, type GameStats } from './achievements';
import { ParticleSystem } from './particles';
import { StatsTracker } from './stats';

// Maze layouts: arrays of obstacle positions
const MAZE_LAYOUTS: GridPos[][] = [
	// Layout 1: cross pattern
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
	// Layout 2: four blocks
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
];

const SNAKE_COLORS = [0x00ff88, 0x00ffaa, 0x22ffcc];
const FOOD_COLORS = [0xff2266, 0xff4488, 0xffaa00, 0x00ccff, 0xaa44ff];

export class GameManager {
	private world: World;
	private arenaGroup: Group;
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

	// Subsystems
	readonly audio: AudioManager;
	readonly achievements: AchievementManager;
	readonly particles: ParticleSystem;
	readonly statsTracker: StatsTracker;

	private moveCount = 0;
	private turnCount = 0;

	// Callbacks for UI updates
	onScoreChange?: (score: number, highScore: number, length: number) => void;
	onStateChange?: (state: GameState, score?: number) => void;
	onCombo?: (count: number) => void;
	onAchievement?: (title: string, desc: string) => void;

	constructor(world: World, arenaGroup: Group) {
		this.world = world;
		this.arenaGroup = arenaGroup;

		this.snakeGroup = new Group();
		this.foodGroup = new Group();
		this.obstacleGroup = new Group();
		arenaGroup.add(this.snakeGroup);
		arenaGroup.add(this.foodGroup);
		arenaGroup.add(this.obstacleGroup);

		this.audio = new AudioManager();
		this.achievements = new AchievementManager();
		this.particles = new ParticleSystem(arenaGroup);
		this.statsTracker = new StatsTracker();

		// Init audio on first interaction
		const initAudio = () => this.audio.init();
		document.addEventListener('click', initAudio, { once: true });
		document.addEventListener('touchstart', initAudio, { once: true });

		// Load high score
		try {
			const saved = localStorage.getItem('neon-snake-highscore');
			if (saved) this.highScore = parseInt(saved, 10) || 0;
		} catch {}
	}

	getState(): GameState { return this.state; }
	getScore(): number { return this.score; }
	getHighScore(): number { return this.highScore; }
	getSnakeLength(): number { return this.snake.length; }
	getMode(): GameMode { return this.config.mode; }
	getDifficulty(): Difficulty { return this.config.difficulty; }
	getGamesPlayed(): number { return this.gamesPlayed; }

	setMode(mode: GameMode) { this.config.mode = mode; }
	setDifficulty(diff: Difficulty) { this.config.difficulty = diff; }

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
		this.moveInterval = DIFFICULTY_SPEEDS[this.config.difficulty];

		// Initialize snake at center
		const mid = Math.floor(GRID_SIZE / 2);
		this.snake = [
			{ x: mid, z: mid },
			{ x: mid, z: mid + 1 },
			{ x: mid, z: mid + 2 },
		];
		this.direction = Direction.Up;
		this.nextDirection = Direction.Up;

		// Setup obstacles for maze mode
		this.obstacles = [];
		if (this.config.mode === GameMode.Maze) {
			const layoutIdx = Math.floor(Math.random() * MAZE_LAYOUTS.length);
			this.obstacles = [...MAZE_LAYOUTS[layoutIdx]];
		}

		this.clearVisuals();
		this.buildObstacles();
		this.spawnFood();
		this.rebuildSnake();

		this.state = GameState.Playing;
		this.gamesPlayed++;
		this.audio.playStart();
		this.onStateChange?.(this.state);
		this.onScoreChange?.(this.score, this.highScore, this.snake.length);
	}

	setDirection(dir: Direction) {
		// Prevent 180-degree turns
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
		this.onStateChange?.(this.state);
	}

	update(delta: number) {
		this.animTime += delta;
		this.particles.update(delta);
		this.achievements.updateTime(delta);

		if (this.state !== GameState.Playing) {
			this.animateIdle(delta);
			return;
		}

		this.sessionTime += delta;

		// Combo timer
		if (this.comboTimer > 0) {
			this.comboTimer -= delta;
			if (this.comboTimer <= 0) this.comboCount = 0;
		}

		this.moveTimer += delta;

		// Speed mode: gradually increase speed
		let interval = this.moveInterval;
		if (this.config.mode === GameMode.Speed) {
			interval = Math.max(0.06, this.moveInterval - this.score * 0.003);
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

		switch (this.direction) {
			case Direction.Up: head.z--; break;
			case Direction.Down: head.z++; break;
			case Direction.Left: head.x--; break;
			case Direction.Right: head.x++; break;
		}

		// Wall collision
		if (head.x < 0 || head.x >= GRID_SIZE || head.z < 0 || head.z >= GRID_SIZE) {
			this.deathByWall = true;
			this.gameOver();
			return;
		}

		// Self collision
		for (const seg of this.snake) {
			if (seg.x === head.x && seg.z === head.z) {
				this.deathBySelf = true;
				this.gameOver();
				return;
			}
		}

		// Obstacle collision
		for (const obs of this.obstacles) {
			if (obs.x === head.x && obs.z === head.z) {
				this.deathByObstacle = true;
				this.gameOver();
				return;
			}
		}

		this.snake.unshift(head);

		// Food collision
		if (head.x === this.food.x && head.z === this.food.z) {
			this.eatFood();
		} else {
			this.snake.pop();
		}

		this.rebuildSnake();
	}

	private eatFood() {
		// Combo system
		this.comboCount++;
		this.comboTimer = 3.0;
		if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;
		const comboMultiplier = Math.min(this.comboCount, 5);
		const points = 10 * comboMultiplier;
		this.score += points;
		this.totalFoodEaten++;

		// Audio
		this.audio.playEat(this.comboCount);

		// Particles at food location
		const foodPos = gridToWorld(this.food.x, this.food.z);
		this.particles.spawnEatEffect(foodPos, 0x00ff88);

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

		// Death particles at snake head
		if (this.snake.length > 0) {
			const headPos = gridToWorld(this.snake[0].x, this.snake[0].z);
			this.particles.spawnDeathEffect(headPos);
		}

		// Check achievements
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
		};

		const newAchs = this.achievements.check(stats);
		for (const ach of newAchs) {
			this.audio.playAchievement();
			this.onAchievement?.(ach.title, ach.description);
		}

		// Save stats
		this.statsTracker.updateAfterGame(
			this.score,
			this.snake.length,
			this.sessionTime,
			this.moveCount,
			this.turnCount,
			this.config.mode,
		);

		this.onStateChange?.(this.state, this.score);
	}

	private spawnFood() {
		const occupied = new Set<string>();
		for (const s of this.snake) occupied.add(`${s.x},${s.z}`);
		for (const o of this.obstacles) occupied.add(`${o.x},${o.z}`);

		const free: GridPos[] = [];
		for (let x = 0; x < GRID_SIZE; x++) {
			for (let z = 0; z < GRID_SIZE; z++) {
				if (!occupied.has(`${x},${z}`)) free.push({ x, z });
			}
		}

		if (free.length === 0) {
			// Win condition — board is full
			this.state = GameState.GameOver;
			this.onStateChange?.(this.state, this.score);
			return;
		}

		this.food = free[Math.floor(Math.random() * free.length)];
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
		// Remove excess meshes
		while (this.snakeMeshes.length > this.snake.length) {
			const m = this.snakeMeshes.pop()!;
			this.snakeGroup.remove(m);
		}

		const segSize = CELL_SIZE * 0.85;
		const headSize = CELL_SIZE * 0.9;

		for (let i = 0; i < this.snake.length; i++) {
			const pos = gridToWorld(this.snake[i].x, this.snake[i].z);
			const isHead = i === 0;
			const size = isHead ? headSize : segSize;

			if (i < this.snakeMeshes.length) {
				// Update existing mesh position
				this.snakeMeshes[i].position.set(pos.x, size / 2 + 0.002, pos.z);
			} else {
				// Create new mesh
				const t = i / Math.max(this.snake.length - 1, 1);
				const colorIdx = Math.floor(t * (SNAKE_COLORS.length - 1));
				const baseColor = SNAKE_COLORS[Math.min(colorIdx, SNAKE_COLORS.length - 1)];

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
			} else {
				const t = i / Math.max(this.snakeMeshes.length - 1, 1);
				mat.emissiveIntensity = 0.7 - t * 0.2 + wave;
			}
		}
	}

	private animateIdle(_delta: number) {
		// Gentle pulsing of obstacle meshes when not playing
		for (const mesh of this.obstacleMeshes) {
			const mat = mesh.material as MeshStandardMaterial;
			mat.emissiveIntensity = 0.6 + Math.sin(this.animTime * 2) * 0.3;
		}
	}
}
