// Shared types for Neon Snake VR

export enum Direction {
	Up = 0,
	Right = 1,
	Down = 2,
	Left = 3,
}

export interface GridPos {
	x: number;
	z: number;
}

export enum GameState {
	Menu = 'menu',
	Playing = 'playing',
	Paused = 'paused',
	GameOver = 'gameover',
}

export enum GameMode {
	Classic = 'classic',
	Speed = 'speed',
	Maze = 'maze',
	Wrap = 'wrap',
	Daily = 'daily',
	TimeAttack = 'timeattack',
}

export enum Difficulty {
	Easy = 'easy',
	Normal = 'normal',
	Hard = 'hard',
}

export enum ArenaTheme {
	Neon = 'neon',
	Lava = 'lava',
	Arctic = 'arctic',
}

export interface ArenaThemeDef {
	id: ArenaTheme;
	label: string;
	boardColor: number;
	gridColor: number;
	wallColor: number;
	wallEmissive: number;
	cornerLightColor: number;
	centerLightColor: number;
	fogColor: number;
	bgColor: number;
	starColor: number;
}

export const ARENA_THEME_DEFS: ArenaThemeDef[] = [
	{
		id: ArenaTheme.Neon,
		label: 'Neon',
		boardColor: 0x050515,
		gridColor: 0x1a2255,
		wallColor: 0x00ccff,
		wallEmissive: 0x0088cc,
		cornerLightColor: 0x00ccff,
		centerLightColor: 0x4400ff,
		fogColor: 0x000811,
		bgColor: 0x000308,
		starColor: 0x4466aa,
	},
	{
		id: ArenaTheme.Lava,
		label: 'Lava',
		boardColor: 0x150808,
		gridColor: 0x552211,
		wallColor: 0xff4400,
		wallEmissive: 0xcc2200,
		cornerLightColor: 0xff6600,
		centerLightColor: 0xff2200,
		fogColor: 0x110400,
		bgColor: 0x080200,
		starColor: 0xaa4422,
	},
	{
		id: ArenaTheme.Arctic,
		label: 'Arctic',
		boardColor: 0x0a0a1a,
		gridColor: 0x2244aa,
		wallColor: 0x88ccff,
		wallEmissive: 0x4488cc,
		cornerLightColor: 0x88ddff,
		centerLightColor: 0x2266ff,
		fogColor: 0x040811,
		bgColor: 0x020408,
		starColor: 0x6688cc,
	},
];

export enum SnakeSkin {
	NeonGreen = 'neon_green',
	CyberBlue = 'cyber_blue',
	FireRed = 'fire_red',
	GoldRush = 'gold_rush',
	Ultraviolet = 'ultraviolet',
}

export interface SnakeSkinDef {
	id: SnakeSkin;
	label: string;
	headColor: number;
	bodyColors: number[];
	trailColor: number;
}

export const SNAKE_SKIN_DEFS: SnakeSkinDef[] = [
	{
		id: SnakeSkin.NeonGreen,
		label: 'Neon Green',
		headColor: 0x00ff88,
		bodyColors: [0x00ff88, 0x00ffaa, 0x22ffcc],
		trailColor: 0x004422,
	},
	{
		id: SnakeSkin.CyberBlue,
		label: 'Cyber Blue',
		headColor: 0x00aaff,
		bodyColors: [0x00aaff, 0x0088ff, 0x4466ff],
		trailColor: 0x001144,
	},
	{
		id: SnakeSkin.FireRed,
		label: 'Fire Red',
		headColor: 0xff4422,
		bodyColors: [0xff4422, 0xff6644, 0xffaa00],
		trailColor: 0x441100,
	},
	{
		id: SnakeSkin.GoldRush,
		label: 'Gold Rush',
		headColor: 0xffcc00,
		bodyColors: [0xffcc00, 0xffaa00, 0xff8800],
		trailColor: 0x332200,
	},
	{
		id: SnakeSkin.Ultraviolet,
		label: 'Ultraviolet',
		headColor: 0xcc44ff,
		bodyColors: [0xcc44ff, 0xaa22ff, 0x8800ff],
		trailColor: 0x220044,
	},
];

export interface GameConfig {
	gridSize: number;
	mode: GameMode;
	difficulty: Difficulty;
	skin: SnakeSkin;
	theme: ArenaTheme;
}

export const DIFFICULTY_SPEEDS: Record<Difficulty, number> = {
	[Difficulty.Easy]: 0.35,
	[Difficulty.Normal]: 0.22,
	[Difficulty.Hard]: 0.13,
};

export const GRID_SIZE = 16;
export const CELL_SIZE = 0.12;
export const BOARD_Y = 0.9;
export const BOARD_Z = -1.2;
export const TIME_ATTACK_DURATION = 60; // seconds

// Seeded RNG for daily challenge
export class SeededRNG {
	private seed: number;

	constructor(seed: number) {
		this.seed = seed;
	}

	next(): number {
		this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
		return (this.seed >>> 0) / 4294967296;
	}

	nextInt(max: number): number {
		return Math.floor(this.next() * max);
	}

	static fromDate(date: Date = new Date()): SeededRNG {
		const y = date.getFullYear();
		const m = date.getMonth();
		const d = date.getDate();
		const seed = y * 10000 + m * 100 + d;
		return new SeededRNG(seed);
	}
}
