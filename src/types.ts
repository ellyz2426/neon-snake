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
}

export enum Difficulty {
	Easy = 'easy',
	Normal = 'normal',
	Hard = 'hard',
}

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
