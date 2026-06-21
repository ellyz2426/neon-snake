import {
	createSystem,
	PanelUI,
	PanelDocument,
	UIKitDocument,
	UIKit,
	eq,
} from '@iwsdk/core';
import type { Entity } from '@iwsdk/core';
import type { GameManager } from './game';
import { GameState, GameMode, Difficulty } from './types';

// Helper to safely get doc and set text
function setText(doc: UIKitDocument | undefined, id: string, text: string) {
	if (!doc) return;
	const el = doc.getElementById(id) as UIKit.Text | undefined;
	el?.setProperties({ text });
}

function setVisible(doc: UIKitDocument | undefined, id: string, visible: boolean) {
	if (!doc) return;
	const el = doc.getElementById(id) as UIKit.Container | undefined;
	el?.setProperties({ display: visible ? 'flex' : 'none' });
}

export class UISystem extends createSystem({
	hud: {
		required: [PanelUI, PanelDocument],
		where: [eq(PanelUI, 'config', './ui/hud.json')],
	},
	menu: {
		required: [PanelUI, PanelDocument],
		where: [eq(PanelUI, 'config', './ui/menu.json')],
	},
	gameover: {
		required: [PanelUI, PanelDocument],
		where: [eq(PanelUI, 'config', './ui/gover.json')],
	},
	pause: {
		required: [PanelUI, PanelDocument],
		where: [eq(PanelUI, 'config', './ui/pause.json')],
	},
}) {
	private game!: GameManager;
	private hudDoc: UIKitDocument | null = null;
	private menuDoc: UIKitDocument | null = null;
	private gameoverDoc: UIKitDocument | null = null;
	private pauseDoc: UIKitDocument | null = null;

	// Panel entities for show/hide
	private hudEntity: Entity | null = null;
	private menuEntity: Entity | null = null;
	private gameoverEntity: Entity | null = null;
	private pauseEntity: Entity | null = null;

	private selectedMode: GameMode = GameMode.Classic;
	private selectedDifficulty: Difficulty = Difficulty.Normal;

	setRefs(refs: { game: GameManager }) {
		this.game = refs.game;
	}

	init() {
		this.queries.hud.subscribe('qualify', (entity) => {
			const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
			if (!doc) return;
			this.hudDoc = doc;
			this.hudEntity = entity;
		});

		this.queries.menu.subscribe('qualify', (entity) => {
			const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
			if (!doc) return;
			this.menuDoc = doc;
			this.menuEntity = entity;
			this.wireMenu(doc);
		});

		this.queries.gameover.subscribe('qualify', (entity) => {
			const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
			if (!doc) return;
			this.gameoverDoc = doc;
			this.gameoverEntity = entity;
			this.wireGameOver(doc);
		});

		this.queries.pause.subscribe('qualify', (entity) => {
			const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
			if (!doc) return;
			this.pauseDoc = doc;
			this.pauseEntity = entity;
			this.wirePause(doc);
		});
	}

	private wireMenu(doc: UIKitDocument) {
		const btnStart = doc.getElementById('btn-start') as UIKit.Text | undefined;
		btnStart?.addEventListener('click', () => {
			this.game.setMode(this.selectedMode);
			this.game.setDifficulty(this.selectedDifficulty);
			this.game.startGame();
		});

		// Mode buttons
		const btnClassic = doc.getElementById('btn-classic') as UIKit.Text | undefined;
		const btnSpeed = doc.getElementById('btn-speed') as UIKit.Text | undefined;
		const btnMaze = doc.getElementById('btn-maze') as UIKit.Text | undefined;

		btnClassic?.addEventListener('click', () => {
			this.selectedMode = GameMode.Classic;
			this.updateModeButtons();
		});
		btnSpeed?.addEventListener('click', () => {
			this.selectedMode = GameMode.Speed;
			this.updateModeButtons();
		});
		btnMaze?.addEventListener('click', () => {
			this.selectedMode = GameMode.Maze;
			this.updateModeButtons();
		});

		// Difficulty buttons
		const btnEasy = doc.getElementById('btn-easy') as UIKit.Text | undefined;
		const btnNormal = doc.getElementById('btn-normal') as UIKit.Text | undefined;
		const btnHard = doc.getElementById('btn-hard') as UIKit.Text | undefined;

		btnEasy?.addEventListener('click', () => {
			this.selectedDifficulty = Difficulty.Easy;
			this.updateDiffButtons();
		});
		btnNormal?.addEventListener('click', () => {
			this.selectedDifficulty = Difficulty.Normal;
			this.updateDiffButtons();
		});
		btnHard?.addEventListener('click', () => {
			this.selectedDifficulty = Difficulty.Hard;
			this.updateDiffButtons();
		});

		this.updateModeButtons();
		this.updateDiffButtons();
	}

	private wireGameOver(doc: UIKitDocument) {
		const btnRetry = doc.getElementById('btn-retry') as UIKit.Text | undefined;
		btnRetry?.addEventListener('click', () => {
			this.game.startGame();
		});

		const btnMenu = doc.getElementById('btn-menu-return') as UIKit.Text | undefined;
		btnMenu?.addEventListener('click', () => {
			this.game.returnToMenu();
		});
	}

	private wirePause(doc: UIKitDocument) {
		const btnResume = doc.getElementById('btn-resume') as UIKit.Text | undefined;
		btnResume?.addEventListener('click', () => {
			this.game.resume();
		});

		const btnQuit = doc.getElementById('btn-quit') as UIKit.Text | undefined;
		btnQuit?.addEventListener('click', () => {
			this.game.returnToMenu();
		});
	}

	private updateModeButtons() {
		if (!this.menuDoc) return;
		const modes = [
			{ id: 'btn-classic', mode: GameMode.Classic },
			{ id: 'btn-speed', mode: GameMode.Speed },
			{ id: 'btn-maze', mode: GameMode.Maze },
		];
		for (const { id, mode } of modes) {
			const btn = this.menuDoc.getElementById(id) as UIKit.Text | undefined;
			if (btn) {
				const active = mode === this.selectedMode;
				btn.setProperties({
					backgroundColor: active ? '#00ff88' : '#222244',
					color: active ? '#000000' : '#aaaacc',
				});
			}
		}
	}

	private updateDiffButtons() {
		if (!this.menuDoc) return;
		const diffs = [
			{ id: 'btn-easy', diff: Difficulty.Easy },
			{ id: 'btn-normal', diff: Difficulty.Normal },
			{ id: 'btn-hard', diff: Difficulty.Hard },
		];
		for (const { id, diff } of diffs) {
			const btn = this.menuDoc.getElementById(id) as UIKit.Text | undefined;
			if (btn) {
				const active = diff === this.selectedDifficulty;
				btn.setProperties({
					backgroundColor: active ? '#00ccff' : '#222244',
					color: active ? '#000000' : '#aaaacc',
				});
			}
		}
	}

	update(_delta: number, _time: number) {
		if (!this.game) return;
		const state = this.game.getState();

		// Update panel visibility
		this.setPanelVisible(this.hudEntity, state === GameState.Playing);
		this.setPanelVisible(this.menuEntity, state === GameState.Menu);
		this.setPanelVisible(this.gameoverEntity, state === GameState.GameOver);
		this.setPanelVisible(this.pauseEntity, state === GameState.Paused);

		// Update HUD
		if (state === GameState.Playing && this.hudDoc) {
			setText(this.hudDoc, 'score-val', String(this.game.getScore()));
			setText(this.hudDoc, 'length-val', String(this.game.getSnakeLength()));
			setText(this.hudDoc, 'high-val', String(this.game.getHighScore()));
		}

		// Update game over panel
		if (state === GameState.GameOver && this.gameoverDoc) {
			setText(this.gameoverDoc, 'final-score', String(this.game.getScore()));
			setText(this.gameoverDoc, 'final-length', String(this.game.getSnakeLength()));
			setText(this.gameoverDoc, 'final-high', String(this.game.getHighScore()));
		}

		// Update menu high score
		if (state === GameState.Menu && this.menuDoc) {
			setText(this.menuDoc, 'menu-high-score', `Best: ${this.game.getHighScore()}`);
		}
	}

	private setPanelVisible(entity: Entity | null, visible: boolean) {
		if (!entity || !entity.object3D) return;
		entity.object3D.visible = visible;
	}
}
