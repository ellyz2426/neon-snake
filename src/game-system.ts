import { createSystem } from '@iwsdk/core';
import type { GameManager } from './game';
import { Direction, GameState } from './types';

export class GameSystem extends createSystem({}) {
	private game!: GameManager;

	setRefs(refs: { game: GameManager }) {
		this.game = refs.game;
	}

	update(delta: number, _time: number) {
		if (!this.game) return;

		this.handleInput();
		this.game.update(delta);
	}

	private handleInput() {
		const state = this.game.getState();

		// Access input manager (keyboard + xr are runtime properties)
		const inputMgr = this.world.input as any;
		const kb = inputMgr.keyboard;

		if (kb && state === GameState.Playing) {
			// Direction keys
			if (kb.getKeyDown('ArrowUp') || kb.getKeyDown('KeyW')) {
				this.game.setDirection(Direction.Up);
			} else if (kb.getKeyDown('ArrowDown') || kb.getKeyDown('KeyS')) {
				this.game.setDirection(Direction.Down);
			} else if (kb.getKeyDown('ArrowLeft') || kb.getKeyDown('KeyA')) {
				this.game.setDirection(Direction.Left);
			} else if (kb.getKeyDown('ArrowRight') || kb.getKeyDown('KeyD')) {
				this.game.setDirection(Direction.Right);
			}

			// Pause
			if (kb.getKeyDown('Escape') || kb.getKeyDown('KeyP')) {
				this.game.pause();
			}
		} else if (kb && state === GameState.Paused) {
			if (kb.getKeyDown('Escape') || kb.getKeyDown('KeyP')) {
				this.game.resume();
			}
		} else if (kb && (state === GameState.Menu || state === GameState.GameOver)) {
			if (kb.getKeyDown('Space') || kb.getKeyDown('Enter')) {
				this.game.startGame();
			}
		}

		// XR controller input
		const right = inputMgr.xr?.gamepads?.right;
		const left = inputMgr.xr?.gamepads?.left;

		if (right) {
			const stick = right.getAxesValues('xr-standard-thumbstick');
			if (stick && state === GameState.Playing) {
				const threshold = 0.5;
				if (Math.abs(stick.x) > Math.abs(stick.y)) {
					if (stick.x > threshold) this.game.setDirection(Direction.Right);
					else if (stick.x < -threshold) this.game.setDirection(Direction.Left);
				} else {
					if (stick.y < -threshold) this.game.setDirection(Direction.Up);
					else if (stick.y > threshold) this.game.setDirection(Direction.Down);
				}
			}

			// Trigger to start / confirm
			if (right.getButtonDown('xr-standard-trigger')) {
				if (state === GameState.Menu || state === GameState.GameOver) {
					this.game.startGame();
				}
			}

			// A button to pause/resume
			if (right.getButtonDown('a-button')) {
				if (state === GameState.Playing) this.game.pause();
				else if (state === GameState.Paused) this.game.resume();
			}
		}

		if (left) {
			const stick = left.getAxesValues('xr-standard-thumbstick');
			if (stick && state === GameState.Playing) {
				const threshold = 0.5;
				if (Math.abs(stick.x) > Math.abs(stick.y)) {
					if (stick.x > threshold) this.game.setDirection(Direction.Right);
					else if (stick.x < -threshold) this.game.setDirection(Direction.Left);
				} else {
					if (stick.y < -threshold) this.game.setDirection(Direction.Up);
					else if (stick.y > threshold) this.game.setDirection(Direction.Down);
				}
			}
		}
	}
}
