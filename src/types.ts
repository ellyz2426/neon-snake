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
}

export enum Difficulty {
	Easy = 'easy',
	Normal = 'normal',
	Hard = 'hard',
}

export interface GameConfig {
	gridSize: number;
	mode: GameMode;
	difficulty: Difficulty;
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
